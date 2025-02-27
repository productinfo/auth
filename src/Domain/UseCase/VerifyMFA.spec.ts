import 'reflect-metadata'
import { authenticator } from 'otplib'

import { User } from '../User/User'
import { UserRepositoryInterface } from '../User/UserRepositoryInterface'
import { VerifyMFA } from './VerifyMFA'
import { Setting } from '../Setting/Setting'
import { SettingServiceInterface } from '../Setting/SettingServiceInterface'
import { SettingName } from '@standardnotes/settings'
import { SelectorInterface } from '@standardnotes/auth'

describe('VerifyMFA', () => {
  let user: User
  let setting: Setting
  let userRepository: UserRepositoryInterface
  let settingService: SettingServiceInterface
  let booleanSelector: SelectorInterface<boolean>
  const pseudoKeyParamsKey = 'foobar'

  const createVerifyMFA = () => new VerifyMFA(
    userRepository,
    settingService,
    booleanSelector,
    pseudoKeyParamsKey
  )

  beforeEach(() => {
    user = {} as jest.Mocked<User>

    userRepository = {} as jest.Mocked<UserRepositoryInterface>
    userRepository.findOneByEmail = jest.fn().mockReturnValue(user)

    booleanSelector = {} as jest.Mocked<SelectorInterface<boolean>>
    booleanSelector.select = jest.fn().mockReturnValue(false)

    setting = {
      name: SettingName.MfaSecret,
      value: 'shhhh',
    } as jest.Mocked<Setting>

    settingService = {} as jest.Mocked<SettingServiceInterface>
    settingService.findSettingWithDecryptedValue = jest.fn().mockReturnValue(setting)
  })

  it('should pass MFA verification if user has no MFA enabled', async () => {
    settingService.findSettingWithDecryptedValue = jest.fn().mockReturnValue(undefined)

    expect(await createVerifyMFA().execute({ email: 'test@test.te', requestParams: {} })).toEqual({
      success: true,
    })
  })

  it('should pass MFA verification if user has MFA deleted', async () => {
    setting = {
      name: SettingName.MfaSecret,
      value: null,
    } as jest.Mocked<Setting>

    settingService.findSettingWithDecryptedValue = jest.fn().mockReturnValue(setting)

    expect(await createVerifyMFA().execute({ email: 'test@test.te', requestParams: {} })).toEqual({
      success: true,
    })
  })

  it('should pass MFA verification if user is not found and pseudo mfa is not required', async () => {
    userRepository.findOneByEmail = jest.fn().mockReturnValue(undefined)
    expect(await createVerifyMFA().execute({ email: 'test@test.te', requestParams: {} })).toEqual({
      success: true,
    })
  })

  it('should not pass MFA verification if user is not found and pseudo mfa is required', async () => {
    booleanSelector.select = jest.fn().mockReturnValue(true)
    userRepository.findOneByEmail = jest.fn().mockReturnValue(undefined)

    expect(await createVerifyMFA().execute({ email: 'test@test.te', requestParams: {} })).toEqual({
      success: false,
      errorTag: 'mfa-required',
      errorMessage: 'Please enter your two-factor authentication code.',
      errorPayload: { mfa_key: expect.stringMatching(/^mfa_/) },
    })
  })

  it('should pass MFA verification if mfa key is correctly encrypted', async () => {
    expect(await createVerifyMFA().execute({ email: 'test@test.te', requestParams: { 'mfa_1-2-3': authenticator.generate('shhhh') } })).toEqual({
      success: true,
    })
  })

  it('should not pass MFA verification if mfa is not correct', async () => {
    setting = {
      name: SettingName.MfaSecret,
      value: 'shhhh2',
    } as jest.Mocked<Setting>

    settingService = {} as jest.Mocked<SettingServiceInterface>
    settingService.findSettingWithDecryptedValue = jest.fn().mockReturnValue(setting)

    expect(await createVerifyMFA().execute({ email: 'test@test.te', requestParams: { 'mfa_1-2-3': 'test' } })).toEqual({
      success: false,
      errorTag: 'mfa-invalid',
      errorMessage: 'The two-factor authentication code you entered is incorrect. Please try again.',
      errorPayload: { mfa_key: 'mfa_1-2-3' },
    })
  })

  it('should not pass MFA verification if no mfa param is found in the request', async () => {
    expect(await createVerifyMFA().execute({ email: 'test@test.te', requestParams: { 'foo': 'bar' } })).toEqual({
      success: false,
      errorTag: 'mfa-required',
      errorMessage: 'Please enter your two-factor authentication code.',
      errorPayload: { mfa_key: expect.stringMatching(/^mfa_/) },
    })
  })

  it('should throw an error if the error is not handled mfa validation error', async () => {
    settingService.findSettingWithDecryptedValue = jest.fn().mockImplementation(() => {
      throw new Error('oops!')
    })

    let error = null
    try {
      await createVerifyMFA().execute({ email: 'test@test.te', requestParams: { 'mfa_1-2-3': 'test' } })
    } catch (caughtError) {
      error = caughtError
    }

    expect(error).not.toBeNull()
  })
})
