import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);
    private readonly transporter: Transporter;
    private readonly from: string;
    private readonly frontendUrl: string;
    private readonly isProduction: boolean;

    constructor(private readonly config: ConfigService) {
        const user = this.config.get<string>('SMTP_USER');
        const pass = this.config.get<string>('SMTP_PASS');

        this.transporter = createTransport({
            host: this.config.getOrThrow<string>('SMTP_HOST'),
            port: Number(this.config.getOrThrow<string>('SMTP_PORT')),
            secure: false, // STARTTLS is negotiated automatically when the server offers it
            ...(user && pass ? { auth: { user, pass } } : {}),
        });

        this.from = this.config.getOrThrow<string>('MAIL_FROM');
        this.frontendUrl = this.config
            .getOrThrow<string>('FRONTEND_URL')
            .replace(/\/+$/, '');
        this.isProduction = this.config.get<string>('NODE_ENV') === 'production';
    }

    async sendVerificationEmail(to: string, token: string): Promise<void> {
        const link = `${this.frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;

        await this.send({
            to,
            subject: 'Verify your email address',
            text: `Welcome! Verify your email address by opening this link (valid for 24 hours):\n\n${link}\n\nIf you did not expect this email, you can ignore it.`,
            html: `<p>Welcome! Verify your email address by clicking the link below (valid for 24 hours):</p><p><a href="${link}">Verify email</a></p><p>If you did not expect this email, you can ignore it.</p>`,
            devLabel: 'Verification link',
            link,
        });
    }

    async sendPasswordResetEmail(to: string, token: string): Promise<void> {
        const link = `${this.frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;

        await this.send({
            to,
            subject: 'Reset your password',
            text: `We received a request to reset your password. Open this link to choose a new one (valid for 1 hour):\n\n${link}\n\nIf you did not request this, you can ignore this email.`,
            html: `<p>We received a request to reset your password. Click the link below to choose a new one (valid for 1 hour):</p><p><a href="${link}">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>`,
            devLabel: 'Password reset link',
            link,
        });
    }

    private async send(opts: {
        to: string;
        subject: string;
        text: string;
        html: string;
        devLabel: string;
        link: string;
    }): Promise<void> {
        try {
            await this.transporter.sendMail({
                from: this.from,
                to: opts.to,
                subject: opts.subject,
                text: opts.text,
                html: opts.html,
            });
        } catch (err) {
            this.logger.error(`Failed to send "${opts.subject}" email`, err);

            if (!this.isProduction) {
                this.logger.warn(`[DEV ONLY] ${opts.devLabel} for ${opts.to}: ${opts.link}`);
            }

            throw err;
        }
    }
}