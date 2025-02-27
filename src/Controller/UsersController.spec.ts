import 'reflect-metadata'

import * as express from 'express'

import { UsersController } from './UsersController'
import { results } from 'inversify-express-utils'
import { User } from '../Domain/User/User'
import { UpdateUser } from '../Domain/UseCase/UpdateUser'
import { GetUserKeyParams } from '../Domain/UseCase/GetUserKeyParams/GetUserKeyParams'
import { DeleteAccount } from '../Domain/UseCase/DeleteAccount/DeleteAccount'
import { GetUserSubscription } from '../Domain/UseCase/GetUserSubscription/GetUserSubscription'
import { ClearLoginAttempts } from '../Domain/UseCase/ClearLoginAttempts'
import { IncreaseLoginAttempts } from '../Domain/UseCase/IncreaseLoginAttempts'
import { ChangeCredentials } from '../Domain/UseCase/ChangeCredentials/ChangeCredentials'
import { InviteToSharedSubscription } from '../Domain/UseCase/InviteToSharedSubscription/InviteToSharedSubscription'

describe('UsersController', () => {
  let updateUser: UpdateUser
  let deleteAccount: DeleteAccount
  let getUserKeyParams: GetUserKeyParams
  let getUserSubscription: GetUserSubscription
  let clearLoginAttempts: ClearLoginAttempts
  let increaseLoginAttempts: IncreaseLoginAttempts
  let changeCredentials: ChangeCredentials
  let inviteToSharedSubscription: InviteToSharedSubscription

  let request: express.Request
  let response: express.Response
  let user: User

  const createController = () => new UsersController(
    updateUser,
    getUserKeyParams,
    deleteAccount,
    getUserSubscription,
    clearLoginAttempts,
    increaseLoginAttempts,
    changeCredentials,
    inviteToSharedSubscription
  )

  beforeEach(() => {
    updateUser = {} as jest.Mocked<UpdateUser>
    updateUser.execute = jest.fn()

    deleteAccount = {} as jest.Mocked<DeleteAccount>
    deleteAccount.execute = jest.fn().mockReturnValue({ success: true, message: 'A OK', responseCode: 200 })

    user = {} as jest.Mocked<User>
    user.uuid = '123'
    user.email = 'test@test.te'

    getUserKeyParams = {} as jest.Mocked<GetUserKeyParams>
    getUserKeyParams.execute = jest.fn()

    getUserSubscription = {} as jest.Mocked<GetUserSubscription>
    getUserSubscription.execute = jest.fn()

    changeCredentials = {} as jest.Mocked<ChangeCredentials>
    changeCredentials.execute = jest.fn()

    clearLoginAttempts = {} as jest.Mocked<ClearLoginAttempts>
    clearLoginAttempts.execute = jest.fn()

    increaseLoginAttempts = {} as jest.Mocked<IncreaseLoginAttempts>
    increaseLoginAttempts.execute = jest.fn()

    inviteToSharedSubscription = {} as jest.Mocked<InviteToSharedSubscription>
    inviteToSharedSubscription.execute = jest.fn()

    request = {
      headers: {},
      body: {},
      params: {},
    } as jest.Mocked<express.Request>

    response = {
      locals: {},
    } as jest.Mocked<express.Response>
  })

  it('should update user', async () => {
    request.body.version = '002'
    request.body.api = '20190520'
    request.body.origination = 'test'
    request.params.userId = '123'
    request.headers['user-agent'] = 'Google Chrome'
    response.locals.user = user

    updateUser.execute = jest.fn().mockReturnValue({ success: true, authResponse: { foo: 'bar' } })

    const httpResponse = <results.JsonResult> await createController().update(request, response)
    const result = await httpResponse.executeAsync()

    expect(updateUser.execute).toHaveBeenCalledWith({
      apiVersion: '20190520',
      kpOrigination: 'test',
      updatedWithUserAgent: 'Google Chrome',
      version: '002',
      user: {
        uuid: '123',
        email: 'test@test.te',
      },
    })

    expect(result.statusCode).toEqual(200)
    expect(await result.content.readAsStringAsync()).toEqual('{"foo":"bar"}')
  })

  it('should not update user if session has read only access', async () => {
    request.body.version = '002'
    request.body.api = '20190520'
    request.body.origination = 'test'
    request.params.userId = '123'
    request.headers['user-agent'] = 'Google Chrome'
    response.locals.user = user
    response.locals.readOnlyAccess = true

    const httpResponse = <results.JsonResult> await createController().update(request, response)
    const result = await httpResponse.executeAsync()

    expect(updateUser.execute).not.toHaveBeenCalled()

    expect(result.statusCode).toEqual(401)
  })

  it('should not update a user if the procedure fails', async () => {
    request.body.version = '002'
    request.body.api = '20190520'
    request.body.origination = 'test'
    request.params.userId = '123'
    request.headers['user-agent'] = 'Google Chrome'
    response.locals.user = user

    updateUser.execute = jest.fn().mockReturnValue({ success: false })

    const httpResponse = <results.JsonResult> await createController().update(request, response)
    const result = await httpResponse.executeAsync()

    expect(updateUser.execute).toHaveBeenCalledWith({
      apiVersion: '20190520',
      kpOrigination: 'test',
      updatedWithUserAgent: 'Google Chrome',
      version: '002',
      user: {
        uuid: '123',
        email: 'test@test.te',
      },
    })

    expect(result.statusCode).toEqual(400)
    expect(await result.content.readAsStringAsync()).toEqual('{"error":{"message":"Could not update user."}}')
  })

  it('should not update a user if it is not the same as logged in user', async () => {
    request.body.version = '002'
    request.body.api = '20190520'
    request.body.origination = 'test'
    request.params.userId = '234'
    request.headers['user-agent'] = 'Google Chrome'
    response.locals.user = user

    const httpResponse = <results.JsonResult> await createController().update(request, response)
    const result = await httpResponse.executeAsync()

    expect(updateUser.execute).not.toHaveBeenCalled()

    expect(result.statusCode).toEqual(401)
    expect(await result.content.readAsStringAsync()).toEqual('{"error":{"message":"Operation not allowed."}}')
  })

  it('should delete user', async () => {
    request.params.email = 'test@test.te'

    const httpResponse = <results.JsonResult> await createController().deleteAccount(request)
    const result = await httpResponse.executeAsync()

    expect(deleteAccount.execute).toHaveBeenCalledWith({ email: 'test@test.te' })

    expect(result.statusCode).toEqual(200)
    expect(await result.content.readAsStringAsync()).toEqual('{"message":"A OK"}')
  })

  it('should get user key params', async () => {
    request.query = {
      email: 'test@test.te',
      uuid: '1-2-3',
    }

    getUserKeyParams.execute = jest.fn().mockReturnValue({ foo: 'bar' })

    const httpResponse = <results.JsonResult> await createController().keyParams(request)
    const result = await httpResponse.executeAsync()

    expect(getUserKeyParams.execute).toHaveBeenCalledWith({
      email: 'test@test.te',
      userUuid: '1-2-3',
      authenticated: false,
    })

    expect(result.statusCode).toEqual(200)
  })

  it('should get authenticated user key params', async () => {
    request.query = {
      email: 'test@test.te',
      uuid: '1-2-3',
      authenticated: 'true',
    }

    getUserKeyParams.execute = jest.fn().mockReturnValue({ foo: 'bar' })

    const httpResponse = <results.JsonResult> await createController().keyParams(request)
    const result = await httpResponse.executeAsync()

    expect(getUserKeyParams.execute).toHaveBeenCalledWith({
      email: 'test@test.te',
      userUuid: '1-2-3',
      authenticated: true,
    })

    expect(result.statusCode).toEqual(200)
  })

  it('should not get user key params if email and user uuid is missing', async () => {
    request.query = {
    }

    getUserKeyParams.execute = jest.fn().mockReturnValue({ foo: 'bar' })

    const httpResponse = <results.JsonResult> await createController().keyParams(request)
    const result = await httpResponse.executeAsync()

    expect(getUserKeyParams.execute).not.toHaveBeenCalled()

    expect(result.statusCode).toEqual(400)
  })

  it('should invite to user subscription', async () => {
    request.body.identifier = 'invitee@test.te'
    response.locals.user = {
      uuid: '1-2-3',
      email: 'test@test.te',
    }

    inviteToSharedSubscription.execute = jest.fn().mockReturnValue({
      success: true,
    })

    const httpResponse = <results.JsonResult> await createController().inviteToSubscriptionSharing(request, response)
    const result = await httpResponse.executeAsync()

    expect(inviteToSharedSubscription.execute).toHaveBeenCalledWith({
      inviterEmail: 'test@test.te',
      inviterUuid: '1-2-3',
      inviteeIdentifier: 'invitee@test.te',
    })

    expect(result.statusCode).toEqual(200)
  })

  it('should not invite to user subscription if the identifier is missing in request', async () => {
    response.locals.user = {
      uuid: '1-2-3',
      email: 'test@test.te',
    }

    const httpResponse = <results.JsonResult> await createController().inviteToSubscriptionSharing(request, response)
    const result = await httpResponse.executeAsync()

    expect(inviteToSharedSubscription.execute).not.toHaveBeenCalled()

    expect(result.statusCode).toEqual(400)
  })

  it('should not invite to user subscription if the workflow does not run', async () => {
    request.body.identifier = 'invitee@test.te'
    response.locals.user = {
      uuid: '1-2-3',
      email: 'test@test.te',
    }

    inviteToSharedSubscription.execute = jest.fn().mockReturnValue({
      success: false,
    })

    const httpResponse = <results.JsonResult> await createController().inviteToSubscriptionSharing(request, response)
    const result = await httpResponse.executeAsync()

    expect(result.statusCode).toEqual(400)
  })

  it('should get user subscription', async () => {
    request.params.userUuid = '1-2-3'
    response.locals.user = {
      uuid: '1-2-3',
    }

    getUserSubscription.execute = jest.fn().mockReturnValue({
      success: true,
    })

    const httpResponse = <results.JsonResult> await createController().getSubscription(request, response)
    const result = await httpResponse.executeAsync()

    expect(getUserSubscription.execute).toHaveBeenCalledWith({
      userUuid: '1-2-3',
    })

    expect(result.statusCode).toEqual(200)
  })

  it('should not get user subscription if the user with provided uuid does not exist', async () => {
    request.params.userUuid = '1-2-3'
    response.locals.user = {
      uuid: '1-2-3',
    }

    getUserSubscription.execute = jest.fn().mockReturnValue({
      success: false,
    })

    const httpResponse = <results.JsonResult> await createController().getSubscription(request, response)
    const result = await httpResponse.executeAsync()

    expect(getUserSubscription.execute).toHaveBeenCalledWith({ userUuid: '1-2-3' })

    expect(result.statusCode).toEqual(400)

  })

  it('should not get user subscription if not allowed', async () => {
    request.params.userUuid = '1-2-3'
    response.locals.user = {
      uuid: '2-3-4',
    }

    getUserSubscription.execute = jest.fn()

    const httpResponse = <results.JsonResult> await createController().getSubscription(request, response)
    const result = await httpResponse.executeAsync()

    expect(getUserSubscription.execute).not.toHaveBeenCalled()

    expect(result.statusCode).toEqual(401)
  })

  it('should change a password', async () => {
    request.body.version = '004'
    request.body.api = '20190520'
    request.body.current_password = 'test123'
    request.body.new_password = 'test234'
    request.body.pw_nonce = 'asdzxc'
    request.body.origination = 'change-password'
    request.body.created = '123'
    request.headers['user-agent'] = 'Google Chrome'
    response.locals.user = user

    changeCredentials.execute = jest.fn().mockReturnValue({ success: true, authResponse: { foo: 'bar' } })

    const httpResponse = <results.JsonResult> await createController().changeCredentials(request, response)
    const result = await httpResponse.executeAsync()

    expect(changeCredentials.execute).toHaveBeenCalledWith({
      apiVersion: '20190520',
      updatedWithUserAgent: 'Google Chrome',
      currentPassword: 'test123',
      newPassword: 'test234',
      kpCreated: '123',
      kpOrigination: 'change-password',
      pwNonce: 'asdzxc',
      protocolVersion: '004',
      user: {
        uuid: '123',
        email: 'test@test.te',
      },
    })

    expect(clearLoginAttempts.execute).toHaveBeenCalled()

    expect(result.statusCode).toEqual(200)
    expect(await result.content.readAsStringAsync()).toEqual('{"foo":"bar"}')
  })

  it('should not change a password if session has read only access', async () => {
    request.body.version = '004'
    request.body.api = '20190520'
    request.body.current_password = 'test123'
    request.body.new_password = 'test234'
    request.body.pw_nonce = 'asdzxc'
    request.body.origination = 'change-password'
    request.body.created = '123'
    request.headers['user-agent'] = 'Google Chrome'
    response.locals.user = user
    response.locals.readOnlyAccess = true

    const httpResponse = <results.JsonResult> await createController().changeCredentials(request, response)
    const result = await httpResponse.executeAsync()

    expect(changeCredentials.execute).not.toHaveBeenCalled()

    expect(clearLoginAttempts.execute).not.toHaveBeenCalled()

    expect(result.statusCode).toEqual(401)
  })

  it('should indicate if changing a password fails', async () => {
    request.body.version = '004'
    request.body.api = '20190520'
    request.body.current_password = 'test123'
    request.body.new_password = 'test234'
    request.body.pw_nonce = 'asdzxc'
    request.headers['user-agent'] = 'Google Chrome'
    response.locals.user = user

    changeCredentials.execute = jest.fn().mockReturnValue({ success: false, errorMessage: 'Something bad happened' })

    const httpResponse = <results.JsonResult> await createController().changeCredentials(request, response)
    const result = await httpResponse.executeAsync()

    expect(increaseLoginAttempts.execute).toHaveBeenCalled()

    expect(result.statusCode).toEqual(401)
    expect(await result.content.readAsStringAsync()).toEqual('{"error":{"message":"Something bad happened"}}')
  })

  it('should not change a password if current password is missing', async () => {
    request.body.version = '004'
    request.body.api = '20190520'
    request.body.new_password = 'test234'
    request.body.pw_nonce = 'asdzxc'
    request.headers['user-agent'] = 'Google Chrome'
    response.locals.user = user

    const httpResponse = <results.JsonResult> await createController().changeCredentials(request, response)
    const result = await httpResponse.executeAsync()

    expect(changeCredentials.execute).not.toHaveBeenCalled()

    expect(result.statusCode).toEqual(400)
    expect(await result.content.readAsStringAsync()).toEqual('{"error":{"message":"Your current password is required to change your password. Please update your application if you do not see this option."}}')
  })

  it('should not change a password if new password is missing', async () => {
    request.body.version = '004'
    request.body.api = '20190520'
    request.body.current_password = 'test123'
    request.body.pw_nonce = 'asdzxc'
    request.headers['user-agent'] = 'Google Chrome'
    response.locals.user = user

    const httpResponse = <results.JsonResult> await createController().changeCredentials(request, response)
    const result = await httpResponse.executeAsync()

    expect(changeCredentials.execute).not.toHaveBeenCalled()

    expect(result.statusCode).toEqual(400)
    expect(await result.content.readAsStringAsync()).toEqual('{"error":{"message":"Your new password is required to change your password. Please try again."}}')
  })

  it('should not change a password if password nonce is missing', async () => {
    request.body.version = '004'
    request.body.api = '20190520'
    request.body.current_password = 'test123'
    request.body.new_password = 'test234'
    request.headers['user-agent'] = 'Google Chrome'
    response.locals.user = user

    const httpResponse = <results.JsonResult> await createController().changeCredentials(request, response)
    const result = await httpResponse.executeAsync()

    expect(changeCredentials.execute).not.toHaveBeenCalled()

    expect(result.statusCode).toEqual(400)
    expect(await result.content.readAsStringAsync()).toEqual('{"error":{"message":"The change password request is missing new auth parameters. Please try again."}}')
  })
})
