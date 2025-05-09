export class CreateUserDto {
  email: string;
  password: string;
  username: string;
  role?: 'user' | 'admin' = 'user';
}