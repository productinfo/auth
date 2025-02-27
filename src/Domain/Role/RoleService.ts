import { SubscriptionName } from '@standardnotes/common'
import { PermissionName } from '@standardnotes/features'
import { inject, injectable } from 'inversify'
import { Logger } from 'winston'

import TYPES from '../../Bootstrap/Types'
import { User } from '../User/User'
import { UserRepositoryInterface } from '../User/UserRepositoryInterface'
import { ClientServiceInterface } from '../Client/ClientServiceInterface'
import { RoleRepositoryInterface } from './RoleRepositoryInterface'
import { RoleServiceInterface } from './RoleServiceInterface'
import { RoleToSubscriptionMapInterface } from './RoleToSubscriptionMapInterface'
import { OfflineUserSubscriptionRepositoryInterface } from '../Subscription/OfflineUserSubscriptionRepositoryInterface'
import { Role } from './Role'
import { OfflineUserSubscription } from '../Subscription/OfflineUserSubscription'

@injectable()
export class RoleService implements RoleServiceInterface {
  constructor(
    @inject(TYPES.UserRepository) private userRepository: UserRepositoryInterface,
    @inject(TYPES.RoleRepository) private roleRepository: RoleRepositoryInterface,
    @inject(TYPES.OfflineUserSubscriptionRepository) private offlineUserSubscriptionRepository: OfflineUserSubscriptionRepositoryInterface,
    @inject(TYPES.WebSocketsClientService) private webSocketsClientService: ClientServiceInterface,
    @inject(TYPES.RoleToSubscriptionMap) private roleToSubscriptionMap: RoleToSubscriptionMapInterface,
    @inject(TYPES.Logger) private logger: Logger,
  ) {
  }

  async userHasPermission(userUuid: string, permissionName: PermissionName): Promise<boolean> {
    const user = await this.userRepository.findOneByUuid(userUuid)
    if (user === undefined) {
      this.logger.warn(`Could not find user with uuid ${userUuid} for permissions check`)

      return false
    }

    const roles = await user.roles
    for (const role of roles) {
      const permissions = await role.permissions
      for (const permission of permissions) {
        if (permission.name === permissionName) {
          return true
        }
      }
    }

    return false
  }

  async addUserRole(
    user: User,
    subscriptionName: SubscriptionName,
  ): Promise<void> {
    const roleName = this.roleToSubscriptionMap.getRoleNameForSubscriptionName(subscriptionName)

    if (roleName === undefined) {
      this.logger.warn(
        `Could not find role name for subscription name: ${subscriptionName}`
      )
      return
    }

    const role = await this.roleRepository.findOneByName(roleName)

    if (role === undefined) {
      this.logger.warn(`Could not find role for role name: ${roleName}`)
      return
    }

    const rolesMap = new Map<string, Role>()
    const currentRoles = await user.roles
    for (const currentRole of currentRoles) {
      rolesMap.set(currentRole.name, currentRole)
    }
    if (!rolesMap.has(role.name)) {
      rolesMap.set(role.name, role)
    }

    user.roles = Promise.resolve([...rolesMap.values()])
    await this.userRepository.save(user)
    await this.webSocketsClientService.sendUserRolesChangedEvent(
      user,
    )
  }

  async setOfflineUserRole(offlineUserSubscription: OfflineUserSubscription): Promise<void> {
    const roleName = this.roleToSubscriptionMap
      .getRoleNameForSubscriptionName(offlineUserSubscription.planName as SubscriptionName)

    if (roleName === undefined) {
      this.logger.warn(`Could not find role name for subscription name: ${offlineUserSubscription.planName}`)

      return
    }

    const role = await this.roleRepository.findOneByName(roleName)

    if (role === undefined) {
      this.logger.warn(`Could not find role for role name: ${roleName}`)

      return
    }

    offlineUserSubscription.roles = Promise.resolve([role])

    await this.offlineUserSubscriptionRepository.save(offlineUserSubscription)
  }

  async removeUserRole(
    user: User,
    subscriptionName: SubscriptionName,
  ): Promise<void> {
    const roleName = this.roleToSubscriptionMap.getRoleNameForSubscriptionName(subscriptionName)

    if (roleName === undefined) {
      this.logger.warn(
        `Could not find role name for subscription name: ${subscriptionName}`
      )
      return
    }

    const currentRoles = await user.roles
    user.roles = Promise.resolve(
      currentRoles.filter(role => role.name !== roleName)
    )
    await this.userRepository.save(user)
    await this.webSocketsClientService.sendUserRolesChangedEvent(
      user,
    )
  }
}
