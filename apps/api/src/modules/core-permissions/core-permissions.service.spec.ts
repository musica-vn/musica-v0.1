import { HttpException } from '@nestjs/common'
import { SupabaseService } from '../../database/supabase.service'
import { CorePermissionsService } from './core-permissions.service'

type DependencyCounts = {
  track_allowed_permissions?: number
  compliance_approved_permissions?: number
  digital_right_config_permissions?: number
  physical_right_config_permissions?: number
  expression_config_permissions?: number
  modification_config_permissions?: number
}

const permissionRow = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Permission',
  law_reference: 'Khoan 1 Dieu 20 Luat SHTT',
  status: 'INACTIVE' as const,
  description: 'Description',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

const createDependencyTableMock = (count: number, error: { message: string } | null = null) => {
  const eq = jest.fn().mockResolvedValue({ count, error })
  const select = jest.fn().mockReturnValue({ eq })

  return { select, eq }
}

const createCorePermissionsTableMock = ({
  updateRow = permissionRow,
  updateError = null,
  deleteError = null,
}: {
  updateRow?: typeof permissionRow | null
  updateError?: { message: string } | null
  deleteError?: { message: string } | null
}) => {
  const maybeSingle = jest.fn().mockResolvedValue({ data: updateRow, error: updateError })
  const select = jest.fn().mockReturnValue({ maybeSingle })
  const updateEq = jest.fn().mockReturnValue({ select })
  const update = jest.fn().mockReturnValue({ eq: updateEq })

  const deleteEq = jest.fn().mockResolvedValue({ error: deleteError })
  const deleteFn = jest.fn().mockReturnValue({ eq: deleteEq })

  return {
    update,
    updateEq,
    select,
    maybeSingle,
    deleteFn,
    deleteEq,
  }
}

const setupFromMock = ({
  dependencyCounts = {},
  dependencyErrorTable,
  corePermissionsTable,
}: {
  dependencyCounts?: DependencyCounts
  dependencyErrorTable?: keyof DependencyCounts
  corePermissionsTable: ReturnType<typeof createCorePermissionsTableMock>
}) => {
  const tableMocks = {
    track_allowed_permissions: createDependencyTableMock(
      dependencyCounts.track_allowed_permissions ?? 0,
      dependencyErrorTable === 'track_allowed_permissions' ? { message: 'track allowed fail' } : null,
    ),
    compliance_approved_permissions: createDependencyTableMock(
      dependencyCounts.compliance_approved_permissions ?? 0,
      dependencyErrorTable === 'compliance_approved_permissions' ? { message: 'approved fail' } : null,
    ),
    digital_right_config_permissions: createDependencyTableMock(
      dependencyCounts.digital_right_config_permissions ?? 0,
      dependencyErrorTable === 'digital_right_config_permissions' ? { message: 'digital fail' } : null,
    ),
    physical_right_config_permissions: createDependencyTableMock(
      dependencyCounts.physical_right_config_permissions ?? 0,
      dependencyErrorTable === 'physical_right_config_permissions' ? { message: 'physical fail' } : null,
    ),
    expression_config_permissions: createDependencyTableMock(
      dependencyCounts.expression_config_permissions ?? 0,
      dependencyErrorTable === 'expression_config_permissions' ? { message: 'expression fail' } : null,
    ),
    modification_config_permissions: createDependencyTableMock(
      dependencyCounts.modification_config_permissions ?? 0,
      dependencyErrorTable === 'modification_config_permissions' ? { message: 'modification fail' } : null,
    ),
  }

  return jest.fn((table: string) => {
    if (table === 'core_permissions') {
      return {
        update: corePermissionsTable.update,
        delete: corePermissionsTable.deleteFn,
      }
    }

    const dependencyTable =
      tableMocks[table as keyof typeof tableMocks] ??
      createDependencyTableMock(0)

    return {
      select: dependencyTable.select,
    }
  })
}

describe('CorePermissionsService', () => {
  const mockSupabaseClient = {
    from: jest.fn(),
  }

  const mockSupabaseService: Pick<SupabaseService, 'client'> = {
    client: mockSupabaseClient as any,
  }

  const createService = () => new CorePermissionsService(mockSupabaseService as any)

  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('blocks inactivate when permission is referenced by licensing configs', async () => {
    const corePermissionsTable = createCorePermissionsTableMock({})
    mockSupabaseClient.from.mockImplementation(
      setupFromMock({
        dependencyCounts: { digital_right_config_permissions: 2 },
        corePermissionsTable,
      }),
    )

    const service = createService()

    await expect(
      service.updateAdminCorePermissionStatus(permissionRow.id, { status: 'INACTIVE' }),
    ).rejects.toMatchObject({
      message: 'CORE_PERMISSION_IN_USE',
      status: 400,
    })

    expect(corePermissionsTable.update).not.toHaveBeenCalled()
  })

  it('updates status successfully when permission has no dependencies', async () => {
    const corePermissionsTable = createCorePermissionsTableMock({})
    mockSupabaseClient.from.mockImplementation(
      setupFromMock({
        dependencyCounts: {},
        corePermissionsTable,
      }),
    )

    const service = createService()
    const result = await service.updateAdminCorePermissionStatus(permissionRow.id, {
      status: 'INACTIVE',
    })

    expect(corePermissionsTable.update).toHaveBeenCalledWith({ status: 'INACTIVE' })
    expect(corePermissionsTable.updateEq).toHaveBeenCalledWith('id', permissionRow.id)
    expect(result).toMatchObject({
      id: permissionRow.id,
      status: 'INACTIVE',
    })
  })

  it('deletes permission when there is no dependency', async () => {
    const corePermissionsTable = createCorePermissionsTableMock({})
    mockSupabaseClient.from.mockImplementation(
      setupFromMock({
        dependencyCounts: {},
        corePermissionsTable,
      }),
    )

    const service = createService()
    const result = await service.deleteAdminCorePermission(permissionRow.id)

    expect(corePermissionsTable.deleteFn).toHaveBeenCalled()
    expect(corePermissionsTable.deleteEq).toHaveBeenCalledWith('id', permissionRow.id)
    expect(result).toEqual({ ok: true })
  })

  it('throws 500 when dependency check query fails', async () => {
    const corePermissionsTable = createCorePermissionsTableMock({})
    mockSupabaseClient.from.mockImplementation(
      setupFromMock({
        dependencyCounts: {},
        dependencyErrorTable: 'expression_config_permissions',
        corePermissionsTable,
      }),
    )

    const service = createService()

    await expect(
      service.updateAdminCorePermissionStatus(permissionRow.id, { status: 'INACTIVE' }),
    ).rejects.toBeInstanceOf(HttpException)
  })
})
