import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { hash } from 'bcrypt';

import { User, UserDocument } from './user.schema';
import { SignUpDto } from './user.dto';
import { DATABASE_ERROR, EXIST_USERNAME, SUCCESSFUL, WRONG_USERNAME } from 'src/returnCode';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async createUser(data: SignUpDto): Promise<any> {
    // check username is used
    const user = await this.userModel.findOne({
      username: data.username
    });

    if (user) return {
      code: EXIST_USERNAME,
      message: 'Username already exists',
      data: {}
    }

    // create new user in database
    const newUser = await new this.userModel({
      username: data.username,
      password: await hash(data.password, 10),
      elo: 1000,
      win: 0,
      draw: 0,
      lose: 0,
    }).save();

    if (newUser) return {
      code: SUCCESSFUL,
      message: 'Successfully',
      data: newUser
    }
    else return {
      code: DATABASE_ERROR,
      message: "Undefine server's error",
      data: {}
    }
  }

  async findUser(username: string): Promise<UserDocument> {
    return await this.userModel.findOne({ username: username });
  }

  async findUserById(id: string): Promise<UserDocument> {
    return await this.userModel.findById(id);
  }

  async updateRefreshToken(
    username: string,
    refreshToken: string
  ) {
    await this.userModel.findOneAndUpdate(
      {username: username},
      { refresh_token: refreshToken ? await hash(refreshToken, 10) : null },
    );
  }

  async changePassword(username: string, newPassword: string) {
    if (
      await this.userModel.findOneAndUpdate(
        { username: username },
        { password: await hash(newPassword, 10) }
      )
    ) {
      return {
        code: SUCCESSFUL,
        message: 'Successfully',
        data: {}
      }
    } else {
      return {
        code: DATABASE_ERROR,
        message: "Undefine server's error"
      };
    }
  }

  async getUserData(username: string) {
    const user = await this.userModel.findOne({
      username: username,
    });

    if (user) {
      return {
        code: SUCCESSFUL,
        message: 'Successfully',
        data: {
          'username': user.username,
          'elo': user.elo,
          'win': user.win,
          'draw': user.draw,
          'lose': user.lose,
        },
      }
    } else {
      return {
        code: WRONG_USERNAME,
        message: 'Username does not exist',
        data: {}
      }
    }
  }
}
