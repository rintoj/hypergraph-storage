import { Column, Entity, JoinColumn, JoinTable, ManyToMany, OneToMany, OneToOne } from 'typeorm'
import { BaseEntity } from '../base-entity'
import { AlbumEntity } from './album-entity'
import { PhotoEntity } from './photo-entity'
import { UserProfileEntity } from './user-profile-entity'
import { UserRole } from './user-role-entity'

@Entity('user')
export class UserEntity extends BaseEntity {
  @Column()
  name?: string

  @Column({ nullable: true })
  email?: string

  @Column({ type: 'enum', name: 'role', enum: UserRole, nullable: true })
  role?: UserRole

  @Column({
    type: 'enum',
    name: 'roles',
    array: true,
    enum: UserRole,
    nullable: true,
  })
  roles?: UserRole[]

  @Column('text', { array: true, nullable: true })
  tags?: string[]

  @Column({ nullable: true })
  profileId?: string

  @OneToOne(() => UserProfileEntity, { nullable: true, cascade: true })
  @JoinColumn()
  profile?: UserProfileEntity

  @ManyToMany(() => UserEntity, { nullable: true })
  @JoinTable({
    name: 'user_followers',
    joinColumn: { name: 'followingUserId' },
    inverseJoinColumn: { name: 'followerUserId' },
  })
  followers?: UserEntity[]

  @OneToMany(() => PhotoEntity, photo => photo.user, { nullable: true })
  photos?: PhotoEntity[]

  @OneToMany(() => AlbumEntity, album => album.owner, { nullable: true })
  albums?: AlbumEntity[]
}
