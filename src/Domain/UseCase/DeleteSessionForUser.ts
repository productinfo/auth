import { inject, injectable } from 'inversify'
import TYPES from '../../Bootstrap/Types'
import { EphemeralSession } from '../Session/EphemeralSession'
import { EphemeralSessionRepositoryInterface } from '../Session/EphemeralSessionRepositoryInterface'
import { Session } from '../Session/Session'
import { SessionRepositoryInterface } from '../Session/SessionRepositoryInterface'
import { SessionServiceInterface } from '../Session/SessionServiceInterface'
import { DeleteSessionForUserDTO } from './DeleteSessionForUserDTO'
import { DeleteSessionForUserResponse } from './DeleteSessionForUserResponse'
import { UseCaseInterface } from './UseCaseInterface'

@injectable()
export class DeleteSessionForUser implements UseCaseInterface {
  constructor(
    @inject(TYPES.SessionRepository) private sessionRepository: SessionRepositoryInterface,
    @inject(TYPES.EphemeralSessionRepository) private ephemeralSessionRepository: EphemeralSessionRepositoryInterface,
    @inject(TYPES.SessionService) private sessionService: SessionServiceInterface
  ) {
  }

  async execute(dto: DeleteSessionForUserDTO): Promise<DeleteSessionForUserResponse> {
    let session: Session | EphemeralSession | undefined

    session = await this.sessionRepository.findOneByUuidAndUserUuid(dto.sessionUuid, dto.userUuid)
    if (session === undefined) {
      session = await this.ephemeralSessionRepository.findOneByUuidAndUserUuid(dto.sessionUuid, dto.userUuid)

      if (session === undefined) {
        return {
          success: false,
          errorMessage: 'No session exists with the provided identifier.',
        }
      }
    }

    await this.sessionService.createRevokedSession(session)

    await this.sessionRepository.deleteOneByUuid(dto.sessionUuid)

    await this.ephemeralSessionRepository.deleteOne(dto.sessionUuid, dto.userUuid)

    return { success: true }
  }
}
