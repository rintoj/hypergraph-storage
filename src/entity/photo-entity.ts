import { Column, Entity, ManyToOne } from 'typeorm'
import { BaseEntity } from '../base-entity'
import { AlbumEntity } from './album-entity'
import { UserEntity } from './user-entity'

@Entity('photo')
export class PhotoEntity extends BaseEntity {
  @Column()
  url?: string

  @ManyToOne(() => UserEntity, user => user.photos)
  user?: UserEntity

  @Column({ nullable: true })
  imageDepth?: number

  @ManyToOne(() => AlbumEntity, album => album.photos, { nullable: true })
  album?: AlbumEntity
}
