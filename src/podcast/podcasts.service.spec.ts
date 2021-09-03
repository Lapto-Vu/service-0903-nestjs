import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Episode } from './entities/episode.entity';
import { Podcast } from './entities/podcast.entity';
import { Repository } from 'typeorm';
import { PodcastsService } from './podcasts.service';

const mockRepository = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
});

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

describe('PodcastService', () => {
  let service: PodcastsService;
  let podcastRepository: MockRepository<Podcast>;
  let episodeRepository: MockRepository<Episode>;

  beforeEach(async () => {
    const module = Test.createTestingModule({
      providers: [
        PodcastsService,
        {
          provide: getRepositoryToken(Podcast),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(Episode),
          useValue: mockRepository(),
        },
      ],
    }).compile();
    service = (await module).get<PodcastsService>(PodcastsService);
    podcastRepository = (await module).get(getRepositoryToken(Podcast));
    episodeRepository = (await module).get(getRepositoryToken(Episode));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllPodcasts', () => {
    it('should return if find all podcast', async () => {
      const allPodcast = [
        {
          title: '',
          category: '',
          rating: 0,
        },
        {
          title: '',
          category: '',
          rating: 1,
        },
      ];
      podcastRepository.find.mockResolvedValue(allPodcast);
      const result = await service.getAllPodcasts();
      expect(podcastRepository.find).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ ok: true, podcasts: allPodcast });
    });

    it('should fail if error has occurred.', async () => {
      podcastRepository.find.mockRejectedValue(new Error());
      const result = await service.getAllPodcasts();
      expect(podcastRepository.find).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        ok: false,
        error: 'Internal server error occurred.',
      });
    });
  });

  describe('createPodcast', () => {
    const createPodcastArgs = {
      title: 'something',
      category: 'horror',
    };

    const newPodcast = {
      id: 1,
      ...createPodcastArgs,
    };
    it('should create and save podcast', async () => {
      podcastRepository.create.mockResolvedValue(newPodcast);
      podcastRepository.save.mockResolvedValue({ id: 1 });
      const result = await service.createPodcast(createPodcastArgs);
      expect(podcastRepository.create).toHaveBeenCalledTimes(1);
      expect(podcastRepository.create).toHaveBeenCalledWith(createPodcastArgs);
      expect(podcastRepository.save).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ ok: true, id: 1 });
    });
    it('should fail if  error has occurred', async () => {
      podcastRepository.create.mockRejectedValue(new Error());
      const result = await service.createPodcast(createPodcastArgs);
      expect(podcastRepository.create).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        ok: false,
        error: 'Internal server error occurred.',
      });
    });
  });

  describe('getPodcast', () => {
    const getPodcastArgs = {
      id: 1,
    };

    it('should fail if there is no podcast', async () => {
      podcastRepository.findOne.mockResolvedValue(null);
      const result = await service.getPodcast(getPodcastArgs.id);
      expect(podcastRepository.findOne).toHaveBeenCalledTimes(1);
      expect(podcastRepository.findOne).toHaveBeenCalledWith(getPodcastArgs, {
        relations: ['episodes'],
      });
      expect(result).toEqual({
        ok: false,
        error: `Podcast with id ${getPodcastArgs.id} not found`,
      });
    });
  });
});
