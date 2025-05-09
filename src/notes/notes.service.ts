import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import { Note } from '../entities/note.entity';
import { CreateNoteDto } from './dto/create-note.dto';
import { User } from '../entities/user.entity';
import { FormattedNote } from './interfaces/formatted-note.interface';

@Injectable()
export class NotesService {
  private readonly logger = new Logger(NotesService.name);

  constructor(
    @InjectRepository(Note)
    private notesRepository: Repository<Note>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private getCacheKey(type: string, id: number): string {
    return `note:${type}:${id}`;
  }

  private async clearUserCache(userId: number): Promise<void> {
    await this.cacheManager.del(this.getCacheKey('user', userId));
    await this.cacheManager.del(this.getCacheKey('shared', userId));
  }

  private formatNote(note: Note): FormattedNote {
    return {
      id: note.id,
      title: note.title,
      content: note.content,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      owner: {
        id: note.owner.id,
        email: note.owner.email,
        username: note.owner.username,
        role: note.owner.role,
      },
      sharedWith: note.sharedWith
        ? note.sharedWith.map((user) => ({
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
          }))
        : [],
    };
  }

  async create(
    userId: number,
    createNoteDto: CreateNoteDto,
  ): Promise<FormattedNote> {
    this.logger.log(`Creating note for user ${userId}`);
    const owner = await this.usersRepository.findOne({ where: { id: userId } });

    if (!owner) {
      this.logger.error(`User with ID ${userId} not found`);
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const note = this.notesRepository.create({
      ...createNoteDto,
      owner,
    });

    const savedNote = await this.notesRepository.save(note);
    await this.clearUserCache(userId);
    this.logger.log(`Note created successfully with ID ${savedNote.id}`);
    return this.formatNote(savedNote);
  }

  async findAll() {
    return this.notesRepository.find({
      relations: ['owner', 'sharedWith'],
    });
  }

  async findAllByUser(
    userId: number,
    isAdmin: boolean = false,
  ): Promise<FormattedNote[]> {
    this.logger.log(`Fetching notes for user ${userId}, isAdmin: ${isAdmin}`);

    if (!isAdmin) {
      const cached = await this.cacheManager.get<FormattedNote[]>(
        this.getCacheKey('user', userId),
      );
      if (cached) {
        this.logger.log(`Cache hit for user ${userId}'s notes`);
        return cached;
      }
    }

    const notes = isAdmin
      ? await this.notesRepository.find({
          relations: ['owner', 'sharedWith'],
        })
      : await this.notesRepository.find({
          where: { owner: { id: userId } },
          relations: ['sharedWith', 'owner'],
        });

    const formattedNotes = notes.map((note) => this.formatNote(note));

    if (!isAdmin) {
      await this.cacheManager.set(
        this.getCacheKey('user', userId),
        formattedNotes,
        60 * 60 * 1000, // 1 hour
      );
    }

    return formattedNotes;
  }

  async findSharedWithUser(
    userId: number,
    isAdmin: boolean = false,
  ): Promise<FormattedNote[]> {
    this.logger.log(
      `Fetching shared notes for user ${userId}, isAdmin: ${isAdmin}`,
    );

    if (!isAdmin) {
      const cached = await this.cacheManager.get<FormattedNote[]>(
        this.getCacheKey('shared', userId),
      );
      if (cached) {
        this.logger.log(`Cache hit for user ${userId}'s shared notes`);
        return cached;
      }
    }

    const notes = isAdmin
      ? await this.notesRepository.find({
          relations: ['owner', 'sharedWith'],
        })
      : await this.notesRepository
          .createQueryBuilder('note')
          .innerJoinAndSelect('note.sharedWith', 'user')
          .innerJoinAndSelect('note.owner', 'owner')
          .where('user.id = :userId', { userId })
          .getMany();

    const formattedNotes = notes.map((note) => this.formatNote(note));

    if (!isAdmin) {
      await this.cacheManager.set(
        this.getCacheKey('shared', userId),
        formattedNotes,
        60 * 60 * 1000, // 1 hour
      );
    }

    return formattedNotes;
  }

  async findOne(
    id: number,
    userId: number,
    isAdmin: boolean = false,
  ): Promise<FormattedNote> {
    this.logger.log(
      `Fetching note ${id} for user ${userId}, isAdmin: ${isAdmin}`,
    );

    const cacheKey = this.getCacheKey('single', id);
    const cached = await this.cacheManager.get<FormattedNote>(cacheKey);

    if (cached) {
      this.logger.log(`Cache hit for note ${id}`);
      const note = cached;

      if (
        !isAdmin &&
        note.owner.id !== userId &&
        !note.sharedWith.some((user) => user.id === userId)
      ) {
        throw new ForbiddenException('Access denied');
      }

      return note;
    }

    const note = await this.notesRepository.findOne({
      where: { id },
      relations: ['owner', 'sharedWith'],
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    if (
      !isAdmin &&
      note.owner.id !== userId &&
      !note.sharedWith.some((user) => user.id === userId)
    ) {
      throw new ForbiddenException('Access denied');
    }

    const formattedNote = this.formatNote(note);
    await this.cacheManager.set(cacheKey, formattedNote, 60 * 60 * 1000); // 1 hour
    return formattedNote;
  }

  async update(
    id: number,
    userId: number,
    updateNoteDto: CreateNoteDto,
    isAdmin: boolean = false,
  ): Promise<FormattedNote> {
    this.logger.log(
      `Updating note ${id} by user ${userId}, isAdmin: ${isAdmin}`,
    );
    const note = await this.findOne(id, userId, isAdmin);

    if (!isAdmin && note.owner.id !== userId) {
      throw new ForbiddenException('Only the owner can update the note');
    }

    const existingNote = await this.notesRepository.findOne({
      where: { id },
      relations: ['owner', 'sharedWith'],
    });

    if (!existingNote) {
      throw new NotFoundException('Note not found');
    }

    Object.assign(existingNote, updateNoteDto);
    const updatedNote = await this.notesRepository.save(existingNote);

    // Clear related caches
    await this.cacheManager.del(this.getCacheKey('single', id));
    await this.clearUserCache(userId);
    await Promise.all(
      note.sharedWith.map((user) => this.clearUserCache(user.id)),
    );

    return this.formatNote(updatedNote);
  }

  async remove(id: number, userId: number, isAdmin: boolean = false) {
    this.logger.log(
      `Removing note ${id} by user ${userId}, isAdmin: ${isAdmin}`,
    );

    // Find the note with access check
    const formattedNote = await this.findOne(id, userId, isAdmin);

    if (!isAdmin && formattedNote.owner.id !== userId) {
      throw new ForbiddenException('Only the owner can delete the note');
    }

    // Clear related caches before deletion
    await this.cacheManager.del(this.getCacheKey('single', id));
    await this.clearUserCache(userId);
    await Promise.all(
      formattedNote.sharedWith.map((user) => this.clearUserCache(user.id)),
    );

    // Fetch the actual entity from the repository
    const noteEntity = await this.notesRepository.findOne({
      where: { id },
      relations: ['owner', 'sharedWith'],
    });

    if (!noteEntity) {
      throw new NotFoundException(`Note with ID ${id} not found`);
    }

    // Remove using the proper entity type
    await this.notesRepository.remove(noteEntity);
    return { success: true };
  }

  async share(
    noteId: number,
    ownerId: number,
    targetUserId: number,
  ): Promise<FormattedNote> {
    this.logger.log(
      `Sharing note ${noteId} from user ${ownerId} to user ${targetUserId}`,
    );
    const note = await this.findOne(noteId, ownerId);

    if (note.owner.id !== ownerId) {
      throw new ForbiddenException('Only the owner can share the note');
    }

    const existingNote = await this.notesRepository.findOne({
      where: { id: noteId },
      relations: ['owner', 'sharedWith'],
    });

    if (!existingNote) {
      throw new NotFoundException('Note not found');
    }

    const targetUser = await this.usersRepository.findOne({
      where: { id: targetUserId },
    });
    if (!targetUser) {
      throw new NotFoundException('Target user not found');
    }

    existingNote.sharedWith = [...existingNote.sharedWith, targetUser];
    const updatedNote = await this.notesRepository.save(existingNote);

    // Clear related caches
    await this.cacheManager.del(this.getCacheKey('single', noteId));
    await this.clearUserCache(targetUserId);

    return this.formatNote(updatedNote);
  }
}
