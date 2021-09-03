import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from 'src/jwt/jwt.service';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

const mockRepository = () => ({
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  findOneOrFail: jest.fn(),
});

const mockJwtService = () => ({
  sign: jest.fn(() => 'signed-token'),
  verify: jest.fn(),
});

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: MockRepository<User>;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module = Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository(),
        },
        {
          provide: JwtService,
          useValue: mockJwtService(),
        },
      ],
    }).compile();
    service = (await module).get<UsersService>(UsersService);
    jwtService = (await module).get<JwtService>(JwtService);
    usersRepository = (await module).get(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createAccount', () => {
    const createAccountArgs = {
      email: 'go@gmail.com',
      password: '1234',
      role: 0,
    };

    it('should fail if user exists', async () => {
      //Mock findOne Method to get a result, meaning there is same email in database.
      usersRepository.findOne.mockResolvedValue({
        id: 1,
        email: 'go@gmail.com',
      });
      //run a createAccount Method, find out what happend.
      const result = await service.createAccount(createAccountArgs);
      //expect to get a result like this.
      expect(result).toMatchObject({
        ok: false,
        error: `There is a user with that email already`,
      });
    });

    it('should create a new user', async () => {
      //undefined, meaning there is no email in the database, thus you can make a account
      usersRepository.findOne.mockResolvedValue(undefined);
      //create Method should return such thing.
      usersRepository.create.mockReturnValue(createAccountArgs);
      //run a createAccount Method, find out waht haaped.
      const result = await service.createAccount(createAccountArgs);
      //check create Method call only one time.
      expect(usersRepository.create).toHaveBeenCalledTimes(1);
      //check create Method get right arguments.
      expect(usersRepository.create).toHaveBeenCalledWith(createAccountArgs);
      //check save Method call only one time.
      expect(usersRepository.save).toHaveBeenCalledTimes(1);
      //check save Method get right arguments.
      expect(usersRepository.save).toHaveBeenCalledWith(createAccountArgs);
      //expect to get a result like this.
      expect(result).toMatchObject({
        ok: true,
        error: null,
      });
    });

    it('should fail save method get a error', async () => {
      //undefined, meaning there is no email in the database, thus you can make a account
      usersRepository.findOne.mockResolvedValue(undefined);
      //create Method should return such thing.
      usersRepository.create.mockReturnValue(createAccountArgs);
      //but save Method get Error
      usersRepository.save.mockRejectedValue(new Error());
      const result = await service.createAccount(createAccountArgs);
      expect(usersRepository.create).toHaveBeenCalledTimes(1);
      expect(usersRepository.create).toHaveBeenCalledWith(createAccountArgs);
      expect(usersRepository.save).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({
        ok: false,
        error: 'Could not create account',
      });
    });
  });

  describe('login', () => {
    const loginArgs = {
      email: 'go@gmail.com',
      password: '1234',
    };

    it('should fail if user not found', async () => {
      usersRepository.findOne.mockResolvedValue(null);
      const result = await service.login(loginArgs);
      expect(usersRepository.findOne).toHaveBeenCalledTimes(1);
      expect(usersRepository.findOne).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
      );
      expect(result).toMatchObject({ ok: false, error: 'User not found' });
    });

    it('should fail if password isnt corret', async () => {
      const mockedUser = {
        id: 1,
        checkPassword: jest.fn(() => Promise.resolve(false)),
      };
      usersRepository.findOne.mockResolvedValue(mockedUser);
      const result = await service.login(loginArgs);
      expect(result).toEqual({
        ok: false,
        error: 'Wrong password',
      });
    });

    it('should return token is corret', async () => {
      const mockedUser = {
        id: 1,
        checkPassword: jest.fn(() => Promise.resolve(true)),
      };
      usersRepository.findOne.mockResolvedValue(mockedUser);
      const result = await service.login(loginArgs);
      expect(jwtService.sign).toHaveBeenCalledTimes(1);
      expect(jwtService.sign).toHaveBeenCalledWith(expect.any(Number));
      expect(result).toEqual({
        ok: true,
        token: 'signed-token',
      });
    });

    it('should fail if there is any error', async () => {
      usersRepository.findOne.mockRejectedValue(new Error());
      const result = await service.login(loginArgs);
      expect(result).toEqual({
        ok: false,
        error: expect.any(Error),
      });
    });
  });

  describe('findById', () => {
    const findByIdArgs = {
      id: 1,
    };

    it('should return if there is user', async () => {
      usersRepository.findOneOrFail.mockResolvedValue(findByIdArgs);
      const result = await service.findById(findByIdArgs.id);
      expect(usersRepository.findOneOrFail).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        ok: true,
        user: findByIdArgs,
      });
    });

    it('should fail if there is no user', async () => {
      usersRepository.findOneOrFail.mockRejectedValue(new Error());
      const result = await service.findById(findByIdArgs.id);
      expect(usersRepository.findOneOrFail).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        ok: false,
        error: 'User Not Found',
      });
    });
  });

  describe('editProfile', () => {
    it('should chage email', async () => {
      const editProfileArgs = {
        userId: 1,
        input: {
          email: 'go@gmail.com',
        },
      };
      const oldUser = {
        email: 'dodo@gmail.com',
        password: '1234',
      };

      usersRepository.findOne.mockResolvedValue(oldUser);
      const result = await service.editProfile(
        editProfileArgs.userId,
        editProfileArgs.input,
      );
      expect(usersRepository.findOne).toHaveBeenCalledTimes(1);
      expect(usersRepository.findOne).toHaveBeenCalledWith(
        editProfileArgs.userId,
      );
      expect(usersRepository.save).toHaveBeenCalledTimes(1);
      expect(usersRepository.save).toHaveBeenCalledWith({
        email: editProfileArgs.input.email,
        password: oldUser.password,
      });
      expect(result).toEqual({ ok: true });
    });

    it('should chage password', async () => {
      const editProfileArgs = {
        userId: 1,
        input: {
          password: '4567',
        },
      };
      const oldUser = {
        email: 'dodo@gmail.com',
        password: '1234',
      };

      usersRepository.findOne.mockResolvedValue(oldUser);
      const result = await service.editProfile(
        editProfileArgs.userId,
        editProfileArgs.input,
      );
      expect(usersRepository.findOne).toHaveBeenCalledTimes(1);
      expect(usersRepository.findOne).toHaveBeenCalledWith(
        editProfileArgs.userId,
      );
      expect(usersRepository.save).toHaveBeenCalledTimes(1);
      expect(usersRepository.save).toHaveBeenCalledWith({
        password: editProfileArgs.input.password,
        email: oldUser.email,
      });
      expect(result).toEqual({ ok: true });
    });

    it('should fail if error has happen', async () => {
      const editProfileArgs = {
        userId: 1,
        input: {
          email: 'go@gmail.com',
        },
      };
      usersRepository.findOne.mockRejectedValue(new Error());
      const result = await service.editProfile(
        editProfileArgs.userId,
        editProfileArgs.input,
      );
      expect(usersRepository.findOne).toHaveBeenCalledTimes(1);
      expect(usersRepository.findOne).toHaveBeenCalledWith(
        editProfileArgs.userId,
      );
      expect(result).toEqual({ ok: false, error: 'Could not update profile' });
    });
  });
});
