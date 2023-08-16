import { Column, Entity } from 'typeorm'
import { BaseEntity } from '../base-entity'

@Entity('user_profile')
export class UserProfileEntity extends BaseEntity {
  @Column()
  gender?: string

  @Column()
  age?: number

  @Column({ nullable: true })
  photo?: string
}
