import { inject, injectable } from 'inversify'
import TYPES from '../../Bootstrap/Types'
import { User } from '../User/User'
import { Setting } from './Setting'
import { SettingProps } from './SettingProps'
import { v4 as uuidv4 } from 'uuid'
import { CrypterInterface } from '../Encryption/CrypterInterface'
import { TimerInterface } from '@standardnotes/time'
import { EncryptionVersion } from '../Encryption/EncryptionVersion'

@injectable()
export class SettingFactory {
  constructor(
    @inject(TYPES.Crypter) private crypter: CrypterInterface,
    @inject(TYPES.Timer) private timer: TimerInterface,
  ) {}

  async create(props: SettingProps, user: User): Promise<Setting> {
    const uuid = props.uuid ?? uuidv4()
    const now = this.timer.getTimestampInMicroseconds()
    const createdAt = props.createdAt ?? now
    const updatedAt = props.updatedAt ?? now

    const {
      name,
      unencryptedValue,
      serverEncryptionVersion = EncryptionVersion.Default,
      sensitive,
    } = props

    const setting: Setting = {
      uuid,
      user: (async () => user)(),
      name,
      value: await this.createValue({
        unencryptedValue,
        serverEncryptionVersion,
        user,
      }),
      serverEncryptionVersion,
      createdAt,
      updatedAt,
      sensitive,
    }

    return Object.assign(new Setting(), setting)
  }

  async createReplacement(
    original: Setting,
    props: SettingProps,
  ): Promise<Setting> {
    const { uuid, user } = original

    return Object.assign(await this.create(props, await user), {
      uuid,
    })
  }

  async createValue({
    unencryptedValue,
    serverEncryptionVersion,
    user,
  }: {
    unencryptedValue: string | null,
    serverEncryptionVersion: number,
    user: User
  }): Promise<string | null> {
    switch(serverEncryptionVersion) {
    case EncryptionVersion.Unencrypted:
      return unencryptedValue
    case EncryptionVersion.Default:
      return this.crypter.encryptForUser(unencryptedValue as string, user)
    default:
      throw Error(`Unrecognized encryption version: ${serverEncryptionVersion}!`)
    }
  }
}
