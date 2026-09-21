import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);

    async sendVerificationEmail(to: string, token: string): Promise<void> {
        // Temporary: logs instead of sending. Replaced by real SMTP in step 3.
        this.logger.log(`Verification token for ${to}: ${token}`);
    }

    async sendPasswordResetEmail(to: string, token: string): Promise<void> {
        this.logger.log(`Password reset token for ${to}: ${token}`);
    }
}