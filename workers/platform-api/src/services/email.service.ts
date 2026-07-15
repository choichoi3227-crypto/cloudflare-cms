// workers/platform-api/src/services/email.service.ts
//
// Resend(https://resend.com) HTTP API를 이용해 트랜잭션 이메일을 발송합니다.
// Cloudflare Workers 런타임은 SMTP 소켓을 직접 열 수 없으므로, HTTP 기반의
// Resend REST API(`POST https://api.resend.com/emails`)를 사용합니다.

export interface EmailServiceConfig {
  apiKey: string;
  fromEmail: string; // 예: "CloudPress <noreply@cloud-press.co.kr>"
}

export class EmailService {
  constructor(private config: EmailServiceConfig) {}

  private async send(params: { to: string; subject: string; html: string }): Promise<void> {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.config.fromEmail,
        to: [params.to],
        subject: params.subject,
        html: params.html,
      }),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      throw new Error(`이메일 발송 실패 (${response.status}): ${errText}`);
    }
  }

  async sendVerificationEmail(params: { to: string; username: string; verifyUrl: string }): Promise<void> {
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
        <h1 style="font-size: 20px; margin-bottom: 16px;">CloudPress 이메일 인증</h1>
        <p style="font-size: 14px; line-height: 1.6; color: #444;">
          안녕하세요, ${escapeHtml(params.username)}님.<br />
          CloudPress 회원가입을 완료하려면 아래 버튼을 눌러 이메일 인증을 진행해주세요.
        </p>
        <a href="${params.verifyUrl}" style="display:inline-block; margin-top:20px; padding:12px 24px; background:#f97316; color:#fff; text-decoration:none; border-radius:8px; font-size:14px; font-weight:600;">
          이메일 인증하기
        </a>
        <p style="font-size: 12px; color: #888; margin-top: 24px;">
          이 링크는 24시간 동안 유효합니다. 본인이 요청하지 않았다면 이 메일을 무시하셔도 됩니다.
        </p>
      </div>
    `;
    await this.send({ to: params.to, subject: '[CloudPress] 이메일 인증을 완료해주세요', html });
  }

  async sendPasswordResetEmail(params: { to: string; username: string; resetUrl: string }): Promise<void> {
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
        <h1 style="font-size: 20px; margin-bottom: 16px;">비밀번호 재설정</h1>
        <p style="font-size: 14px; line-height: 1.6; color: #444;">
          안녕하세요, ${escapeHtml(params.username)}님.<br />
          비밀번호 재설정을 요청하셨습니다. 아래 버튼을 눌러 새 비밀번호를 설정해주세요.
        </p>
        <a href="${params.resetUrl}" style="display:inline-block; margin-top:20px; padding:12px 24px; background:#f97316; color:#fff; text-decoration:none; border-radius:8px; font-size:14px; font-weight:600;">
          비밀번호 재설정
        </a>
        <p style="font-size: 12px; color: #888; margin-top: 24px;">
          이 링크는 1시간 동안 유효합니다. 본인이 요청하지 않았다면 이 메일을 무시하셔도 됩니다.
        </p>
      </div>
    `;
    await this.send({ to: params.to, subject: '[CloudPress] 비밀번호 재설정 안내', html });
  }
}

function escapeHtml(input: string): string {
  return input.replace(/[<>'"&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;', '&': '&amp;' }[c] ?? c));
}
