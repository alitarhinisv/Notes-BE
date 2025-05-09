import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Note } from '../entities/note.entity';
import { CreateNoteDto } from './dto/create-note.dto';
import { User } from '../entities/user.entity';

@Injectable()
export class NotesService {
  constructor(
    @InjectRepository(Note)
    private notesRepository: Repository<Note>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(userId: number, createNoteDto: CreateNoteDto): Promise<Note> {
    const owner = await this.usersRepository.findOne({ where: { id: userId } });
    
    if (!owner) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    
    const note = this.notesRepository.create({
      ...createNoteDto,
      owner,
    });
    
    return this.notesRepository.save(note);
  }

  async findAll() {
    return this.notesRepository.find({
      relations: ['owner', 'sharedWith'],
    });
  }

  async findAllByUser(userId: number, isAdmin: boolean = false) {
    if (isAdmin) {
      return this.notesRepository.find({
        relations: ['owner', 'sharedWith'],
      });
    }
    return this.notesRepository.find({
      where: { owner: { id: userId } },
      relations: ['sharedWith', 'owner'],
    });
  }

  async findSharedWithUser(userId: number) {
    return this.notesRepository
      .createQueryBuilder('note')
      .innerJoinAndSelect('note.sharedWith', 'user')
      .where('user.id = :userId', { userId })
      .getMany();
  }

  async findOne(id: number, userId: number, isAdmin: boolean = false) {
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
    const note = await this.findOne(id, userId, isAdmin);
    
    if (!isAdmin && note.owner.id !== userId) {
      throw new ForbiddenException('Only the owner can update the note');
    }

    Object.assign(note, updateNoteDto);
    return this.notesRepository.save(note);
  }

  async remove(id: number, userId: number, isAdmin: boolean = false) {
    const note = await this.findOne(id, userId, isAdmin);
    
    if (!isAdmin && note.owner.id !== userId) {
      throw new ForbiddenException('Only the owner can delete the note');
    }

    await this.notesRepository.remove(note);
    return { success: true };
  }

  async share(noteId: number, ownerId: number, targetUserId: number) {
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