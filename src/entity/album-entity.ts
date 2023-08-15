import { Column, Entity, ManyToOne, OneToMany } from '../typeorm'
import { BaseEntity } from '../base-entity'
import { PhotoEntity } from './photo-entity'
import { UserEntity } from './user-entity'

@Entity('album')
export class AlbumEntity extends BaseEntity {
  @Column()
  name?: string

  @Column({ nullable: true })
  ownerId?: string

  @ManyToOne(() => UserEntity, user => user.albums)
  owner?: UserEntity

  @OneToMany(() => PhotoEntity, photo => photo.album, { nullable: true })
  photos?: PhotoEntity[]
}
