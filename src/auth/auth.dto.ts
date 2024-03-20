export class SignUpDto {
  username: string;
  password: string;
  name: string;
  age: number;
}

export class SignInDto {
  username: string;
  password: string;
}

export class ChangePasswordDto {
  oldPassword: string;
  newPassword: string;
}