import axios from 'axios'
import { MenuUpdateService } from '~/plugins/menu-update-service'

jest.mock('axios', () => ({ post: jest.fn() }))
jest.mock('~/core/helpers/configuration', () => ({ okamApiBaseUrl: 'http://localhost:5090', version: 'test' }))

describe('menu update instruction transport', () => {
  beforeEach(() => { axios.post.mockReset().mockResolvedValue({ data: {} }) })

  it('keeps instructions out of the menu text field in multipart uploads', async () => {
    const file = new File(['pdf'], 'menu.pdf', { type: 'application/pdf' })
    await new MenuUpdateService({ bearerToken: 'test' }).Analyze(7, { files: [file], instructions: 'Keep names' })
    const [, form] = axios.post.mock.calls[0]
    expect(form.get('instructions')).toBe('Keep names')
    expect(form.get('text')).toBeNull()
    expect(form.get('files').name).toBe('menu.pdf')
  })

  it('preserves the separate menu text API input and remap instructions', async () => {
    const service = new MenuUpdateService({})
    await service.Analyze(7, { text: 'Pizza 242', instructions: 'Keep names' })
    expect(axios.post.mock.calls[0][1].get('text')).toBe('Pizza 242')
    expect(axios.post.mock.calls[0][1].get('instructions')).toBe('Keep names')
    await service.Remap(7, { documents: [], instructions: 'Keep names' })
    expect(axios.post.mock.calls[1][1].instructions).toBe('Keep names')
  })
})
