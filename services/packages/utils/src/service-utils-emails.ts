import { ofetch } from 'shared/fetch';
import { environment } from './environment';

interface PostmarkResponse {
  ErrorCode: number;
  Message: string;
  MessageID: string;
  SubmittedAt: string;
  To: string;
}

/**
 * Send an email
 * @param root named parameters
 * @param root.body the body of the email
 * @param root.subject the subject of the email
 * @param root.to the email address of the recipient
 */
export async function sendEmail({
  body,
  subject,
  to,
}: {
  body: string;
  subject: string;
  to: string;
}): Promise<void> {
  await ofetch<PostmarkResponse>('https://api.postmarkapp.com/email', {
    body: JSON.stringify({
      From: 'noreply@ansearch.net', // todo: change this
      HtmlBody: body,
      MessageStream: 'outbound',
      Subject: subject,
      To: to,
    }),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Postmark-Server-Token': environment.POSTMARK_KEY,
    },
    method: 'POST',
  });
}
