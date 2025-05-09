import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { ShareNoteDto } from './dto/share-note.dto';

@Controller('notes')
@UseGuards(JwtAuthGuard)
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Post()
  create(@Request() req, @Body() createNoteDto: CreateNoteDto) {
    return this.notesService.create(req.user.id, createNoteDto);
  }

  @Get()
  findAll(@Request() req) {
    const isAdmin = req.user.role === 'admin';
    return this.notesService.findAllByUser(req.user.id, isAdmin);
  }

  @Get('shared')
  findShared(@Request() req) {
    const isAdmin = req.user.role === 'admin';
    return this.notesService.findSharedWithUser(req.user.id, isAdmin);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    const isAdmin = req.user.role === 'admin';
    return this.notesService.findOne(+id, req.user.id, isAdmin);
  }

  @Put(':id')
  update(@Request() req, @Param('id') id: string, @Body() updateNoteDto: CreateNoteDto) {
    const isAdmin = req.user.role === 'admin';
    return this.notesService.update(+id, req.user.id, updateNoteDto, isAdmin);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    const isAdmin = req.user.role === 'admin';
    return this.notesService.remove(+id, req.user.id, isAdmin);
  }

  @Post(':id/share')
  share(@Request() req, @Param('id') id: string, @Body() shareNoteDto: ShareNoteDto) {
    return this.notesService.share(+id, req.user.id, shareNoteDto.userId);
  }
}