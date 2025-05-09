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
    return this.notesService.findAllByUser(req.user.id);
  }

  @Get('shared')
  findShared(@Request() req) {
    return this.notesService.findSharedWithUser(req.user.id);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.notesService.findOne(+id, req.user.id);
  }

  @Put(':id')
  update(@Request() req, @Param('id') id: string, @Body() updateNoteDto: CreateNoteDto) {
    return this.notesService.update(+id, req.user.id, updateNoteDto);
  }

  @Post(':id/share')
  share(@Request() req, @Param('id') id: string, @Body() shareNoteDto: ShareNoteDto) {
    return this.notesService.share(+id, req.user.id, shareNoteDto.userId);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.notesService.remove(+id, req.user.id);
  }
}