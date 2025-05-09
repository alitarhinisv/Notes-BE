import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Note } from '../entities/note.entity';
import { CreateNoteDto } from './dto/create-note.dto';
import { User } from '../entities/user.entity';

@Injectable()
export class NotesService {
  private readonly logger = new Logger(NotesService.name);

  constructor(
    @InjectRepository(Note)
    private notesRepository: Repository<Note>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(userId: number, createNoteDto: CreateNoteDto): Promise<Note> {
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
    this.logger.log(`Note created successfully with ID ${savedNote.id}`);
    return savedNote;
  }

  async findAll() {
    return this.notesRepository.find({
      relations: ['owner', 'sharedWith'],
    });
  }

  async findAllByUser(userId: number, isAdmin: boolean = false) {
    this.logger.log(`Fetching notes for user ${userId}, isAdmin: ${isAdmin}`);
    if (isAdmin) {
      const notes = await this.notesRepository.find({
        relations: ['owner', 'sharedWith'],
      });
      
      return notes.map(note => ({
        ...note,
        owner: {
          id: note.owner.id,
          email: note.owner.email,
          username: note.owner.username,
          role: note.owner.role
        },
        sharedWith: note.sharedWith.map(user => ({
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role
        }))
      }));
    }
    
    const notes = await this.notesRepository.find({
      where: { owner: { id: userId } },
      relations: ['sharedWith', 'owner'],
    });
    
    return notes.map(note => ({
      ...note,
      owner: {
        id: note.owner.id,
        email: note.owner.email,
        username: note.owner.username,
        role: note.owner.role
      },
      sharedWith: note.sharedWith.map(user => ({
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role
      }))
    }));
  }

  async findSharedWithUser(userId: number, isAdmin: boolean = false) {
    this.logger.log(`Fetching shared notes for user ${userId}, isAdmin: ${isAdmin}`);
    if (isAdmin) {
      const notes = await this.notesRepository.find({
        relations: ['owner', 'sharedWith'],
      });
      
      return notes.map(note => ({
        ...note,
        owner: {
          id: note.owner.id,
          email: note.owner.email,
          username: note.owner.username,
          role: note.owner.role
        },
        sharedWith: note.sharedWith.map(user => ({
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role
        }))
      }));
    }
    
    const notes = await this.notesRepository
      .createQueryBuilder('note')
      .innerJoinAndSelect('note.sharedWith', 'user')
      .innerJoinAndSelect('note.owner', 'owner')
      .where('user.id = :userId', { userId })
      .getMany();
  
    return notes.map(note => ({
      ...note,
      owner: {
        id: note.owner.id,
        email: note.owner.email,
        username: note.owner.username,
        role: note.owner.role
      },
      sharedWith: note.sharedWith.map(user => ({
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role
      }))
    }));
  }

  async findOne(id: number, userId: number, isAdmin: boolean = false) {
    this.logger.log(`Fetching note ${id} for user ${userId}, isAdmin: ${isAdmin}`);
    const note = await this.notesRepository.findOne({
      where: { id },
      relations: ['owner', 'sharedWith'],
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    if (!isAdmin && note.owner.id !== userId && !note.sharedWith.some(user => user.id === userId)) {
      throw new ForbiddenException('Access denied');
    }

    return note;
  }

  async update(id: number, userId: number, updateNoteDto: CreateNoteDto, isAdmin: boolean = false) {
    this.logger.log(`Updating note ${id} by user ${userId}, isAdmin: ${isAdmin}`);
    const note = await this.findOne(id, userId, isAdmin);
    
    if (!isAdmin && note.owner.id !== userId) {
      throw new ForbiddenException('Only the owner can update the note');
    }

    Object.assign(note, updateNoteDto);
    return this.notesRepository.save(note);
  }

  async remove(id: number, userId: number, isAdmin: boolean = false) {
    this.logger.log(`Removing note ${id} by user ${userId}, isAdmin: ${isAdmin}`);
    const note = await this.findOne(id, userId, isAdmin);
    
    if (!isAdmin && note.owner.id !== userId) {
      throw new ForbiddenException('Only the owner can delete the note');
    }

    await this.notesRepository.remove(note);
    return { success: true };
  }

  async share(noteId: number, ownerId: number, targetUserId: number) {
    this.logger.log(`Sharing note ${noteId} from user ${ownerId} to user ${targetUserId}`);
    const note = await this.findOne(noteId, ownerId);
    
    if (note.owner.id !== ownerId) {
      throw new ForbiddenException('Only the owner can share the note');
    }

    const targetUser = await this.usersRepository.findOne({ where: { id: targetUserId } });
    if (!targetUser) {
      throw new NotFoundException('Target user not found');
    }

    note.sharedWith = [...note.sharedWith, targetUser];
    return this.notesRepository.save(note);
  }
}