import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test, type TestingModule } from '@nestjs/testing'
import jwt from 'jsonwebtoken'
import request from 'supertest'
import type { App } from 'supertest/types'
import { AppModule } from './../src/app.module'
import { ManagedUsersService } from './../src/modules/managed-users/managed-users.service'
import { SupabaseService } from './../src/database/supabase.service'

const signToken = (payload: { sub: string; roles: string[] }) =>
  jwt.sign(payload, process.env.JWT_SECRET ?? 'dev-secret', { expiresIn: 60 * 60 })

describe('Managed users (e2e)', () => {
  let app: INestApplication<App>

  const managedUsersServiceMock = {
    listUsers: async () => ({
      items: [
        {
          id: 'u_buyer_1',
          email: 'buyer01@musica.local',
          fullName: 'Buyer 01',
          status: 'ACTIVE',
          roleCodes: ['BUYER'],
          createdAt: new Date().toISOString(),
        },
      ],
      totalItems: 1,
    }),
    createUser: async (payload: any) => ({
      id: 'u_user_new',
      email: payload.email,
      fullName: payload.fullName,
      status: 'ACTIVE',
      roleCodes: [payload.roleCode],
      createdAt: new Date().toISOString(),
    }),
    updateUser: async (userId: string, payload: any) => ({
      id: userId,
      email: payload.email ?? 'buyer01@musica.local',
      fullName: payload.fullName ?? 'Buyer 01',
      status: 'ACTIVE',
      roleCodes: ['BUYER'],
      createdAt: new Date().toISOString(),
    }),
    updateUserStatus: async (userId: string, status: any) => ({
      id: userId,
      email: 'buyer01@musica.local',
      fullName: 'Buyer 01',
      status,
      roleCodes: ['BUYER'],
      createdAt: new Date().toISOString(),
    }),
    softDeleteUser: async () => {},
  }

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SupabaseService)
      .useValue({ client: {} })
      .overrideProvider(ManagedUsersService)
      .useValue(managedUsersServiceMock)
      .compile()

    app = moduleFixture.createNestApplication()
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    )
    await app.init()
  })

  it('GET /admin/users without token -> 401', async () => {
    const response = await request(app.getHttpServer()).get('/admin/users').expect(401)
    expect(response.body.success).toBe(false)
    expect(response.body.statusCode).toBe(401)
  })

  it('GET /admin/users with BUYER token -> 403', async () => {
    const token = signToken({ sub: 'u_buyer', roles: ['BUYER'] })
    const response = await request(app.getHttpServer()).get('/admin/users').set('Authorization', `Bearer ${token}`).expect(403)

    expect(response.body.success).toBe(false)
    expect(response.body.statusCode).toBe(403)
  })

  it('GET /admin/users with ADMIN token -> 200 + pagination meta', async () => {
    const token = signToken({ sub: 'u_admin', roles: ['ADMIN'] })
    const response = await request(app.getHttpServer()).get('/admin/users').set('Authorization', `Bearer ${token}`).expect(200)

    expect(response.body.success).toBe(true)
    expect(Array.isArray(response.body.data.items)).toBe(true)
    expect(response.body.meta.pagination).toMatchObject({
      page: 1,
      pageSize: 20,
      totalItems: 1,
    })
  })

  it('POST /admin/users with ADMIN token -> 201', async () => {
    const token = signToken({ sub: 'u_admin', roles: ['ADMIN'] })
    const response = await request(app.getHttpServer())
      .post('/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'newbuyer@musica.local', fullName: 'New Buyer', password: 'Password123!', roleCode: 'BUYER' })
      .expect(201)

    expect(response.body.success).toBe(true)
    expect(response.body.data.email).toBe('newbuyer@musica.local')
    expect(response.body.data.roleCodes).toEqual(['BUYER'])
  })

  it('PATCH /admin/users/:userId/status with SUPER_ADMIN token -> 200', async () => {
    const token = signToken({ sub: 'u_superadmin', roles: ['SUPER_ADMIN'] })
    const response = await request(app.getHttpServer())
      .patch('/admin/users/u_buyer_1/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'LOCKED' })
      .expect(200)

    expect(response.body.success).toBe(true)
    expect(response.body.data.status).toBe('LOCKED')
  })

  afterEach(async () => {
    await app.close()
  })
})
