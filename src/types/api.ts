export type ApiErrorResponse = {
  error: string
}

export type MessagesResponse = {
  messages: {
    id: string
    role: string
    content: unknown
    createdAt: string
  }[]
}

export type WhitelistCreateResponse = {
  id: string
  waId: string
}
