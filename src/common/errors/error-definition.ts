
// A stable machine-readable code plus its English message. Frontends switch on `code`.
export interface ErrorDefinition {
  readonly code: string;
  readonly message: string;
}