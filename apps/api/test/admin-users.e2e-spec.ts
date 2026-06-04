import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test, type TestingModule } from '@nestjs/testing'
import jwt from 'jsonwebtoken'
import request from 'supertest'
import type { App } from 'supertest/types'
import { AppModule } from './../src/app.module'
import { AdminUsersService } from './../src/modules/admin-users/admin-users.service'
import { SupabaseService } from './../src/database/supabase.service'

const signToken = (payload: { sub: string; roles: string[] }) =>
  jwt.sign(payload, process.env.JWT_SECRET ?? 'dev-secret', { expiresIn: 60 * 60 })

describe('Admin users (e2e)', () => {
  let app: INestApplication<App>

  const adminUsersServiceMock = {
    listAdmins: async () => ({
      items: [
        {
          id: 'u_admin_1',
          email: 'admin01@musica.local',
          fullName: 'Admin 01',
          status: 'ACTIVE',
          roleCodes: ['ADMIN'],
          createdAt: new Date().toISOString(),
        },
      ],
      totalItems: 1,
    }),
    createAdmin: async (payload: any) => ({
      id: 'u_admin_new',
      email: payload.email,
      fullName: payload.fullName,
      status: 'ACTIVE',
      roleCodes: ['ADMIN'],
      createdAt: new Date().toISOString(),
    }),
    updateAdmin: async (adminId: string, payload: any) => ({
      id: adminId,
      email: payload.email ?? 'admin01@musica.local',
      fullName: payload.fullName ?? 'Admin 01',
      status: 'ACTIVE',
      roleCodes: ['ADMIN'],
      createdAt: new Date().toISOString(),
    }),
    updateAdminStatus: async (adminId: string, status: any) => ({
      id: adminId,
      email: 'admin01@musica.local',
      fullName: 'Admin 01',
      status,
      roleCodes: ['ADMIN'],
      createdAt: new Date().toISOString(),
    }),
    softDeleteAdmin: async () => {},
  }

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SupabaseService)
      .useValue({ client: {} })
      .overrideProvider(AdminUsersService)
      .useValue(adminUsersServiceMock)
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

  it('GET /admin/users/admins without token -> 401', async () => {
    const response = await request(app.getHttpServer()).get('/admin/users/admins').expect(401)
    expect(response.body.success).toBe(false)
    expect(response.body.statusCode).toBe(401)
  })

  it('GET /admin/users/admins with ADMIN token -> 403', async () => {
    const token = signToken({ sub: 'u_admin', roles: ['ADMIN'] })
    const response = await request(app.getHttpServer())
      .get('/admin/users/admins')
      .set('Authorization', `Bearer ${token}`)
      .expect(403)

    expect(response.body.success).toBe(false)
    expect(response.body.statusCode).toBe(403)
  })

  it('GET /admin/users/admins with SUPER_ADMIN token -> 200 + pagination meta', async () => {
    const token = signToken({ sub: 'u_superadmin', roles: ['SUPER_ADMIN'] })
    const response = await request(app.getHttpServer())
      .get('/admin/users/admins')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(response.body.success).toBe(true)
    expect(Array.isArray(response.body.data.items)).toBe(true)
    expect(response.body.meta.pagination).toMatchObject({
      page: 1,
      pageSize: 20,
      totalItems: 1,
    })
  })

  it('POST /admin/users/admins with SUPER_ADMIN token -> 200', async () => {
    const token = signToken({ sub: 'u_superadmin', roles: ['SUPER_ADMIN'] })
    const response = await request(app.getHttpServer())
      .post('/admin/users/admins')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'newadmin@musica.local', fullName: 'New Admin', password: 'Password123!' })
      .expect(201)

    expect(response.body.success).toBe(true)
    expect(response.body.data.email).toBe('newadmin@musica.local')
  })

  afterEach(async () => {
    await app.close()
  })
})

