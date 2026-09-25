import { FikenConnectService } from '~/core/services/fiken-connect-service'
import { RequestService } from '~/core/services/request-service'

jest.mock('~/core/services/request-service')

describe('FikenConnectService.Complete', () => {
  test('posts state and code to connect/complete and returns the outcome', async () => {
    RequestService.mockImplementation(() => ({
      PostRequest: jest.fn().mockResolvedValue({ status: 200, data: { storeId: 7, status: 'connected' } }),
      TryParseResponseWithError: r => ({ data: r.data })
    }))
    const service = new FikenConnectService({})
    const instance = RequestService.mock.results[0].value

    const result = await service.Complete('the-state', 'the-code')

    expect(instance.PostRequest).toHaveBeenCalledWith('/fiken/connect/complete', { state: 'the-state', code: 'the-code' })
    expect(result).toEqual({ storeId: 7, status: 'connected' })
  })

  test('throws the API message when completion is refused', async () => {
    RequestService.mockImplementation(() => ({
      PostRequest: jest.fn().mockResolvedValue({ status: 400 }),
      TryParseResponseWithError: () => ({ error: 'Ugyldig eller utløpt state.' })
    }))
    const service = new FikenConnectService({})

    await expect(service.Complete('s', 'c')).rejects.toThrow('Ugyldig eller utløpt state.')
  })
})
