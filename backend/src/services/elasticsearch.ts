import { Client } from '@elastic/elasticsearch';
import { config } from '../config';
import { EmailJob } from '@prisma/client';

export const esClient = new Client({
  node: config.ELASTICSEARCH_NODE,
  maxRetries: 3,
  requestTimeout: 5000,
});

export const EMAILS_INDEX = 'emails';

let isESHealthy = false;

export async function initElasticsearch() {
  try {
    const health = await esClient.ping();
    if (!health) {
      console.warn('⚠️ Elasticsearch ping failed. Search fallback mode active.');
      isESHealthy = false;
      return;
    }

    isESHealthy = true;
    const indexExists = await esClient.indices.exists({ index: EMAILS_INDEX });

    if (!indexExists) {
      await esClient.indices.create({
        index: EMAILS_INDEX,
        body: {
          mappings: {
            properties: {
              id: { type: 'keyword' },
              userId: { type: 'keyword' },
              senderId: { type: 'keyword' },
              recipientEmail: { type: 'text', fields: { keyword: { type: 'keyword' } } },
              subject: { type: 'text' },
              body: { type: 'text' },
              status: { type: 'keyword' },
              scheduledAt: { type: 'date' },
              sentAt: { type: 'date' },
              previewUrl: { type: 'keyword' },
              createdAt: { type: 'date' },
            },
          },
        },
      });
      console.log(`✅ Elasticsearch index '${EMAILS_INDEX}' created`);
    } else {
      console.log(`✅ Elasticsearch connected and index '${EMAILS_INDEX}' ready`);
    }
  } catch (error: any) {
    console.warn(`⚠️ Elasticsearch initialization failed (${error.message}). Database fallback search will be used.`);
    isESHealthy = false;
  }
}

export async function indexEmailDoc(emailJob: EmailJob) {
  try {
    if (!isESHealthy) {
      // Retry ping
      isESHealthy = await esClient.ping().catch(() => false);
    }
    if (!isESHealthy) return;

    await esClient.index({
      index: EMAILS_INDEX,
      id: emailJob.id,
      document: {
        id: emailJob.id,
        userId: emailJob.userId,
        senderId: emailJob.senderId,
        recipientEmail: emailJob.recipientEmail,
        subject: emailJob.subject,
        body: emailJob.body,
        status: emailJob.status,
        scheduledAt: emailJob.scheduledAt.toISOString(),
        sentAt: emailJob.sentAt ? emailJob.sentAt.toISOString() : null,
        previewUrl: emailJob.previewUrl,
        createdAt: emailJob.createdAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error(`⚠️ Elasticsearch indexing failed for email ${emailJob.id}:`, error.message);
    // Non-blocking failure: Email sending continues cleanly.
  }
}

export async function searchEmailsInES(userId: string, queryText: string, status?: string) {
  try {
    if (!isESHealthy) {
      isESHealthy = await esClient.ping().catch(() => false);
    }
    if (!isESHealthy) return null; // Signal fallback to DB

    const mustClause: any[] = [{ term: { userId } }];
    if (status) {
      mustClause.push({ term: { status } });
    }

    const shouldClause: any[] = [
      { match: { recipientEmail: { query: queryText, boost: 3 } } },
      { match: { subject: { query: queryText, boost: 2 } } },
      { match: { body: { query: queryText, boost: 1 } } },
      { wildcard: { recipientEmail: { value: `*${queryText.toLowerCase()}*` } } },
      { wildcard: { subject: { value: `*${queryText.toLowerCase()}*` } } },
    ];

    const response = await esClient.search({
      index: EMAILS_INDEX,
      body: {
        query: {
          bool: {
            must: mustClause,
            should: queryText ? shouldClause : [],
            minimum_should_match: queryText ? 1 : 0,
          },
        },
        sort: [{ scheduledAt: { order: 'desc' } }],
        size: 100,
      },
    });

    const hits = response.hits.hits.map((hit: any) => hit._source);
    return hits;
  } catch (error: any) {
    console.error('⚠️ Elasticsearch search error:', error.message);
    return null; // Return null to trigger DB search fallback
  }
}
