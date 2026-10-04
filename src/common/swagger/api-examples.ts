// One consistent example set for every DTO, so Swagger and Postman tell one story. All values are fake
export const EXAMPLES = {
  userId: 1,
  name: 'Mohamed Skaik',
  email: 'skaik@restaurant.com',
  role: 'WAITER',
  password: 'S3cure-Passw0rd!',
  newPassword: 'N3w-Secure-Passw0rd!',
  accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsInJvbGUiOiJXQUlURVIifQ.signature',
  refreshToken: '42.Zm9vYmFyYmF6cXV4Y29ycHVzMTIzNDU2Nzg5MGFiY2RlZg',
  oneTimeToken: 'kcEx42OsInZ2i0T-yJOUPNgQS1_PFU8OxIYnaidNQeY',
  timestamp: '2026-09-21T15:00:00.000Z',

  categoryId: 1,
  categoryName: 'Pizza',
  categorySortOrder: 10,

  menuItemId: 1,
  menuItemName: 'Margherita',
  menuItemDescription: 'Tomato, mozzarella and fresh basil',
  menuItemPrice: '12.50',
  menuItemImageUrl: 'https://cdn.example.com/menu/margherita.jpg',
  menuItemSortOrder: 10,
} as const;