import { createClient } from '@supabase/supabase-js'
import { hash } from 'bcryptjs'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const parseEnvLine = (line) => {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) return null

  const eqIndex = trimmed.indexOf('=')
  if (eqIndex <= 0) return null

  const key = trimmed.slice(0, eqIndex).trim()
  let value = trimmed.slice(eqIndex + 1).trim()

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1)
  }

  return { key, value }
}

const readEnvFileContent = (filePath) => {
  const buffer = fs.readFileSync(filePath)
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.toString('utf16le')
  }

  const hasNullByte = buffer.includes(0x00)
  if (hasNullByte) {
    return buffer.toString('utf16le')
  }

  return buffer.toString('utf8')
}

const loadEnvFromFiles = () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url))
  const envName = process.env.NODE_ENV ?? 'development'
  const candidates = [`.env.${envName}`, '.env']
  const roots = [
    path.resolve(scriptDir, '..'),
    path.resolve(process.cwd(), 'apps', 'api'),
    process.cwd(),
  ]

  roots.forEach((root) => {
    candidates.forEach((fileName) => {
      const filePath = path.join(root, fileName)
      if (!fs.existsSync(filePath)) return

      const content = readEnvFileContent(filePath)
      content.split(/\r?\n/).forEach((line) => {
        const parsed = parseEnvLine(line)
        if (!parsed) return
        if (process.env[parsed.key] !== undefined && process.env[parsed.key] !== '') return
        process.env[parsed.key] = parsed.value
      })
    })
  })
}

loadEnvFromFiles()

const requireEnv = (name) => {
  const value = process.env[name]
  if (!value) {
    const scriptDir = path.dirname(fileURLToPath(import.meta.url))
    const apiRoot = path.resolve(scriptDir, '..')
    const envPath = path.join(apiRoot, '.env')
    const envDevPath = path.join(apiRoot, '.env.development')

    const safeStat = (p) => {
      try {
        return fs.statSync(p).size
      } catch {
        return -1
      }
    }

    throw new Error(
      `Missing ${name}. Checked env files: .env.size=${safeStat(envPath)}, .env.development.size=${safeStat(envDevPath)}`,
    )
  }
  return value
}

const supabaseUrl = requireEnv('SUPABASE_URL')
const supabaseServiceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')

const client = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const seedPassword = 'Password123!'
const seedTag = ' (Seed)'

const seedPermissionIds = {
  reproduction: '3c6c1819-73b5-4d50-8a62-2c84c6152c11',
  distribution: '3c6c1819-73b5-4d50-8a62-2c84c6152c12',
  communication: '3c6c1819-73b5-4d50-8a62-2c84c6152c13',
  performance: '3c6c1819-73b5-4d50-8a62-2c84c6152c14',
  derivative: '3c6c1819-73b5-4d50-8a62-2c84c6152c15',
}

const usersSeed = [
  { email: 'superadmin@musica.local', full_name: 'Super Admin', roleName: 'Super Admin' },
  { email: 'admin01@musica.local', full_name: 'Admin 01', roleName: 'Admin' },
  { email: 'admin02@musica.local', full_name: 'Admin 02', roleName: 'Admin' },
  { email: 'artist01@musica.local', full_name: 'Artist 01', roleName: 'Artist' },
  { email: 'artist02@musica.local', full_name: 'Artist 02', roleName: 'Artist' },
  { email: 'artist03@musica.local', full_name: 'Artist 03', roleName: 'Artist' },
  { email: 'buyer01@musica.local', full_name: 'Buyer 01', roleName: 'Buyer' },
  { email: 'buyer02@musica.local', full_name: 'Buyer 02', roleName: 'Buyer' },
  { email: 'buyer03@musica.local', full_name: 'Buyer 03', roleName: 'Buyer' },
  { email: 'buyer04@musica.local', full_name: 'Buyer 04', roleName: 'Buyer' },
  { email: 'buyer05@musica.local', full_name: 'Buyer 05', roleName: 'Buyer' },
  { email: 'buyer06@musica.local', full_name: 'Buyer 06', roleName: 'Buyer' },
  { email: 'buyer07@musica.local', full_name: 'Buyer 07', roleName: 'Buyer' },
  { email: 'buyer08@musica.local', full_name: 'Buyer 08', roleName: 'Buyer' },
]

const tracksSeed = [
  { title: `Midnight Pulse${seedTag}`, artistEmail: 'artist01@musica.local', genre: 'Electronic', duration: 182, status: 'PUBLISHED' },
  { title: `Neon Skyline${seedTag}`, artistEmail: 'artist01@musica.local', genre: 'Electronic', duration: 156, status: 'PUBLISHED' },
  { title: `Cinematic Rise${seedTag}`, artistEmail: 'artist02@musica.local', genre: 'Cinematic', duration: 201, status: 'PUBLISHED' },
  { title: `Corporate Breeze${seedTag}`, artistEmail: 'artist02@musica.local', genre: 'Corporate', duration: 128, status: 'PUBLISHED' },
  { title: `Pop Spark${seedTag}`, artistEmail: 'artist03@musica.local', genre: 'Pop', duration: 174, status: 'PUBLISHED' },
  { title: `Ambient Drift${seedTag}`, artistEmail: 'artist03@musica.local', genre: 'Cinematic', duration: 223, status: 'PUBLISHED' },
  { title: `Late Night Drive${seedTag}`, artistEmail: 'artist01@musica.local', genre: 'Electronic', duration: 190, status: 'PUBLISHED' },
  { title: `Bright Morning${seedTag}`, artistEmail: 'artist02@musica.local', genre: 'Pop', duration: 165, status: 'PUBLISHED' },
  { title: `Soft Focus${seedTag}`, artistEmail: 'artist03@musica.local', genre: 'Corporate', duration: 142, status: 'PUBLISHED' },
  { title: `Festival Lights${seedTag}`, artistEmail: 'artist01@musica.local', genre: 'Pop', duration: 198, status: 'PUBLISHED' },
  { title: `Hidden Draft 01${seedTag}`, artistEmail: 'artist01@musica.local', genre: 'Electronic', duration: 160, status: 'HIDDEN' },
  { title: `Hidden Draft 02${seedTag}`, artistEmail: 'artist02@musica.local', genre: 'Cinematic', duration: 210, status: 'HIDDEN' },
  { title: `Hidden Draft 03${seedTag}`, artistEmail: 'artist03@musica.local', genre: 'Corporate', duration: 120, status: 'HIDDEN' },
  { title: `Hidden Draft 04${seedTag}`, artistEmail: 'artist01@musica.local', genre: 'Pop', duration: 175, status: 'HIDDEN' },
  { title: `Hidden Draft 05${seedTag}`, artistEmail: 'artist02@musica.local', genre: 'Corporate', duration: 135, status: 'HIDDEN' },
  { title: `Ocean Haze${seedTag}`, artistEmail: 'artist03@musica.local', genre: 'Ambient', duration: 204, status: 'PUBLISHED' },
  { title: `Street Rhythm${seedTag}`, artistEmail: 'artist01@musica.local', genre: 'HipHop', duration: 177, status: 'PUBLISHED' },
  { title: `Golden Hour${seedTag}`, artistEmail: 'artist02@musica.local', genre: 'Pop', duration: 189, status: 'PUBLISHED' },
  { title: `Tech Pulse${seedTag}`, artistEmail: 'artist01@musica.local', genre: 'Electronic', duration: 161, status: 'HIDDEN' },
  { title: `Minimal Corporate${seedTag}`, artistEmail: 'artist03@musica.local', genre: 'Corporate', duration: 133, status: 'HIDDEN' },
]

const certificatesSeed = [
  { trackTitle: `Midnight Pulse${seedTag}`, buyerEmail: 'buyer01@musica.local', rights: ['DERIVATIVE_WORK_RIGHT'], daysAgo: 3 },
  { trackTitle: `Neon Skyline${seedTag}`, buyerEmail: 'buyer01@musica.local', rights: ['COMMUNICATION_TO_PUBLIC_RIGHT'], daysAgo: 8 },
  { trackTitle: `Cinematic Rise${seedTag}`, buyerEmail: 'buyer02@musica.local', rights: ['DERIVATIVE_WORK_RIGHT'], daysAgo: 6 },
  { trackTitle: `Corporate Breeze${seedTag}`, buyerEmail: 'buyer03@musica.local', rights: ['REPRODUCTION_RIGHT'], daysAgo: 10 },
  { trackTitle: `Pop Spark${seedTag}`, buyerEmail: 'buyer04@musica.local', rights: ['DISTRIBUTION_RIGHT'], daysAgo: 2 },
  { trackTitle: `Ambient Drift${seedTag}`, buyerEmail: 'buyer05@musica.local', rights: ['DERIVATIVE_WORK_RIGHT'], daysAgo: 4 },
  { trackTitle: `Late Night Drive${seedTag}`, buyerEmail: 'buyer06@musica.local', rights: ['COMMUNICATION_TO_PUBLIC_RIGHT'], daysAgo: 1 },
  { trackTitle: `Bright Morning${seedTag}`, buyerEmail: 'buyer07@musica.local', rights: ['REPRODUCTION_RIGHT', 'COMMUNICATION_TO_PUBLIC_RIGHT'], daysAgo: 7 },
  { trackTitle: `Soft Focus${seedTag}`, buyerEmail: 'buyer08@musica.local', rights: ['DISTRIBUTION_RIGHT'], daysAgo: 12 },
  { trackTitle: `Festival Lights${seedTag}`, buyerEmail: 'buyer02@musica.local', rights: ['DERIVATIVE_WORK_RIGHT'], daysAgo: 5 },
  { trackTitle: `Ocean Haze${seedTag}`, buyerEmail: 'buyer03@musica.local', rights: ['REPRODUCTION_RIGHT'], daysAgo: 9 },
  { trackTitle: `Street Rhythm${seedTag}`, buyerEmail: 'buyer04@musica.local', rights: ['DISTRIBUTION_RIGHT'], daysAgo: 11 },
  { trackTitle: `Golden Hour${seedTag}`, buyerEmail: 'buyer05@musica.local', rights: ['DISTRIBUTION_RIGHT'], daysAgo: 13 },
]

const corePermissionsSeed = [
  {
    id: seedPermissionIds.reproduction,
    name: `Quyen sao chep${seedTag}`,
    law_reference: 'Khoan 1 Dieu 20 Luat SHTT',
    description: 'Cho phep sao chep ban ghi va tac pham phuc vu khai thac thuong mai.',
    status: 'ACTIVE',
  },
  {
    id: seedPermissionIds.distribution,
    name: `Quyen phan phoi${seedTag}`,
    law_reference: 'Khoan 2 Dieu 20 Luat SHTT',
    description: 'Cho phep phan phoi ban sao, ban ghi va cac hinh thuc luu hanh hop phap.',
    status: 'ACTIVE',
  },
  {
    id: seedPermissionIds.communication,
    name: `Quyen truyen dat den cong chung${seedTag}`,
    law_reference: 'Khoan 3 Dieu 20 Luat SHTT',
    description: 'Cho phep dua tac pham den cong chung thong qua nen tang so va kenh phat hanh.',
    status: 'ACTIVE',
  },
  {
    id: seedPermissionIds.performance,
    name: `Quyen bieu dien truoc cong chung${seedTag}`,
    law_reference: 'Khoan 4 Dieu 20 Luat SHTT',
    description: 'Cho phep bieu dien, phat nhac va khai thac trong cac khong gian cong cong.',
    status: 'ACTIVE',
  },
  {
    id: seedPermissionIds.derivative,
    name: `Quyen lam tac pham phai sinh${seedTag}`,
    law_reference: 'Khoan 5 Dieu 20 Luat SHTT',
    description: 'Cho phep cai bien, phoi khi va tao san pham phai sinh tu tac pham goc.',
    status: 'ACTIVE',
  },
]

const digitalRightConfigsSeed = [
  {
    id: '8b53d577-0815-4d1d-bc4c-1d1e58f28501',
    target_platform: 'YOUTUBE',
    duration_type: 'ONE_YEAR',
    base_price_multiplier: 1.25,
    status: 'ACTIVE',
    permissionIds: [seedPermissionIds.reproduction, seedPermissionIds.communication],
  },
  {
    id: '8b53d577-0815-4d1d-bc4c-1d1e58f28502',
    target_platform: 'TIKTOK',
    duration_type: 'PERPETUAL',
    base_price_multiplier: 1.6,
    status: 'ACTIVE',
    permissionIds: [
      seedPermissionIds.reproduction,
      seedPermissionIds.communication,
      seedPermissionIds.distribution,
    ],
  },
]

const physicalRightConfigsSeed = [
  {
    id: '8b53d577-0815-4d1d-bc4c-1d1e58f28511',
    venue_usage_type: `Quan cafe${seedTag}`,
    base_price_multiplier: 1.1,
    status: 'ACTIVE',
    permissionIds: [seedPermissionIds.performance],
  },
  {
    id: '8b53d577-0815-4d1d-bc4c-1d1e58f28512',
    venue_usage_type: `Hoi cho su kien${seedTag}`,
    base_price_multiplier: 1.45,
    status: 'ACTIVE',
    permissionIds: [seedPermissionIds.performance, seedPermissionIds.communication],
  },
]

const expressionConfigsSeed = [
  {
    id: '8b53d577-0815-4d1d-bc4c-1d1e58f28521',
    name: `Nhac nen Vlog${seedTag}`,
    price_multiplier: 1.2,
    status: 'ACTIVE',
    permissionIds: [seedPermissionIds.reproduction, seedPermissionIds.communication],
  },
  {
    id: '8b53d577-0815-4d1d-bc4c-1d1e58f28522',
    name: `Nhac quang cao${seedTag}`,
    price_multiplier: 1.85,
    status: 'ACTIVE',
    permissionIds: [
      seedPermissionIds.reproduction,
      seedPermissionIds.communication,
      seedPermissionIds.distribution,
    ],
  },
]

const modificationConfigsSeed = [
  {
    id: '8b53d577-0815-4d1d-bc4c-1d1e58f28531',
    name: `Giu nguyen master${seedTag}`,
    price_multiplier: 1,
    status: 'ACTIVE',
    permissionIds: [seedPermissionIds.reproduction],
  },
  {
    id: '8b53d577-0815-4d1d-bc4c-1d1e58f28532',
    name: `Cai bien phoi khi${seedTag}`,
    price_multiplier: 2.1,
    status: 'ACTIVE',
    permissionIds: [seedPermissionIds.reproduction, seedPermissionIds.derivative],
  },
]

const buildComplianceSeedEntries = () =>
  tracksSeed.map((trackSeed, index) => {
    if (trackSeed.status === 'PUBLISHED') {
      const approvedPermissionGroups = [
        [seedPermissionIds.reproduction, seedPermissionIds.communication],
        [seedPermissionIds.reproduction, seedPermissionIds.distribution],
        [seedPermissionIds.performance, seedPermissionIds.communication],
        [seedPermissionIds.reproduction, seedPermissionIds.derivative],
      ]

      return {
        trackTitle: trackSeed.title,
        legal_status: 'SUFFICIENT',
        review_status: 'APPROVED',
        reject_reason: null,
        permissionIds: approvedPermissionGroups[index % approvedPermissionGroups.length],
        fileCount: 2,
      }
    }

    if (index % 2 === 0) {
      return {
        trackTitle: trackSeed.title,
        legal_status: 'INSUFFICIENT',
        review_status: 'REJECTED',
        reject_reason: 'Ho so phap ly seed chua dat yeu cau doi voi tac pham nay.',
        permissionIds: [],
        fileCount: 1,
      }
    }

    return {
      trackTitle: trackSeed.title,
      legal_status: 'PENDING',
      review_status: 'PENDING',
      reject_reason: null,
      permissionIds: [],
      fileCount: 1,
    }
  })

const getMonthPath = (date) => {
  const year = String(date.getUTCFullYear()).padStart(4, '0')
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${year}/${month}`
}

const upsertSeedConfigs = async ({
  tableName,
  mappingTableName,
  configForeignKey,
  configs,
  permissionIdSet,
}) => {
  const configRows = configs.map(({ permissionIds, ...rest }) => rest)

  const { error: upsertConfigsError } = await client
    .from(tableName)
    .upsert(configRows, { onConflict: 'id' })

  if (upsertConfigsError) throw new Error(upsertConfigsError.message)

  const { data: insertedConfigs, error: fetchConfigsError } = await client
    .from(tableName)
    .select('id')
    .in('id', configs.map((item) => item.id))

  if (fetchConfigsError) throw new Error(fetchConfigsError.message)

  const configIds = (insertedConfigs ?? []).map((item) => item.id)

  if (configIds.length > 0) {
    const { error: deleteMappingsError } = await client
      .from(mappingTableName)
      .delete()
      .in(configForeignKey, configIds)

    if (deleteMappingsError) throw new Error(deleteMappingsError.message)
  }

  const mappingRows = configs.flatMap((config) => {
    return config.permissionIds.map((permissionId) => {
      if (!permissionIdSet.has(permissionId)) throw new Error(`Missing permission id for ${permissionId}`)

      return {
        [configForeignKey]: config.id,
        core_permission_id: permissionId,
      }
    })
  })

  if (mappingRows.length > 0) {
    const { error: insertMappingsError } = await client.from(mappingTableName).insert(mappingRows)
    if (insertMappingsError) throw new Error(insertMappingsError.message)
  }
}

const isMissingTableError = (message) =>
  typeof message === 'string' &&
  (message.includes("Could not find the table 'public.certificate_templates'") ||
    message.includes('relation "public.certificate_templates" does not exist') ||
    message.includes('relation "certificate_templates" does not exist'))

const main = async () => {
  const { data: existingUsers, error: existingUsersError } = await client
    .from('users')
    .select('id,email')
    .ilike('email', '%@musica.local')

  if (existingUsersError) throw new Error(existingUsersError.message)

  const seedUserIds = (existingUsers ?? []).map((x) => x.id)

  if (seedUserIds.length > 0) {
    const { data: buyerCertIds, error: buyerCertIdsError } = await client
      .from('certificates')
      .select('id')
      .in('buyer_id', seedUserIds)

    if (buyerCertIdsError) throw new Error(buyerCertIdsError.message)

    const { data: artistCertIds, error: artistCertIdsError } = await client
      .from('certificates')
      .select('id')
      .in('artist_id', seedUserIds)

    if (artistCertIdsError) throw new Error(artistCertIdsError.message)

    const certificateIds = Array.from(
      new Set([...(buyerCertIds ?? []), ...(artistCertIds ?? [])].map((x) => x.id)),
    )

    if (certificateIds.length > 0) {
      const { error: delCertError } = await client.from('certificates').delete().in('id', certificateIds)
      if (delCertError) throw new Error(delCertError.message)
    }

    const { data: createdByTrackIds, error: createdByTrackIdsError } = await client
      .from('products')
      .select('id')
      .in('created_by', seedUserIds)

    if (createdByTrackIdsError) throw new Error(createdByTrackIdsError.message)

    const { data: titleTrackIds, error: titleTrackIdsError } = await client
      .from('products')
      .select('id')
      .ilike('title', `%${seedTag}%`)

    if (titleTrackIdsError) throw new Error(titleTrackIdsError.message)

    const trackIds = Array.from(
      new Set([...(createdByTrackIds ?? []), ...(titleTrackIds ?? [])].map((x) => x.id)),
    )

    if (trackIds.length > 0) {
      const { error: delTracksError } = await client.from('products').delete().in('id', trackIds)
      if (delTracksError) throw new Error(delTracksError.message)
    }

    const { error: delUserRolesError } = await client
      .from('user_roles')
      .delete()
      .in('user_id', seedUserIds)

    if (delUserRolesError) throw new Error(delUserRolesError.message)

    const { error: delUsersError } = await client.from('users').delete().in('id', seedUserIds)
    if (delUsersError) throw new Error(delUsersError.message)
  }

  const { error: delTemplateError } = await client
    .from('certificate_templates')
    .delete()
    .gt('id', 0)
  if (delTemplateError && !isMissingTableError(delTemplateError.message)) {
    throw new Error(delTemplateError.message)
  }

  const passwordHash = await hash(seedPassword, 10)

  const usersToInsert = usersSeed.map((u) => ({
    email: u.email,
    full_name: u.full_name,
    password_hash: passwordHash,
    status: 'ACTIVE',
  }))

  const { data: insertedUsers, error: insertUsersError } = await client
    .from('users')
    .insert(usersToInsert)
    .select('id,email,full_name')

  if (insertUsersError) throw new Error(insertUsersError.message)

  const emailToUser = new Map((insertedUsers ?? []).map((u) => [u.email, u]))
  const userIdToFullName = new Map((insertedUsers ?? []).map((u) => [u.id, u.full_name]))

  const { data: roles, error: rolesError } = await client.from('roles').select('id,name')
  if (rolesError) throw new Error(rolesError.message)

  const roleNameToId = new Map((roles ?? []).map((r) => [r.name, r.id]))

  const userRolesToInsert = usersSeed.map((u) => {
    const user = emailToUser.get(u.email)
    const roleId = roleNameToId.get(u.roleName)
    if (!user || !roleId) throw new Error(`Missing user/role mapping for ${u.email}`)
    return { user_id: user.id, role_id: roleId }
  })

  const { error: insertUserRolesError } = await client.from('user_roles').insert(userRolesToInsert)
  if (insertUserRolesError) throw new Error(insertUserRolesError.message)

  const { error: upsertCorePermissionsError } = await client
    .from('core_permissions')
    .upsert(corePermissionsSeed, { onConflict: 'id' })

  if (upsertCorePermissionsError) throw new Error(upsertCorePermissionsError.message)

  const { data: insertedCorePermissions, error: fetchCorePermissionsError } = await client
    .from('core_permissions')
    .select('id')
    .in('id', corePermissionsSeed.map((permission) => permission.id))

  if (fetchCorePermissionsError) throw new Error(fetchCorePermissionsError.message)

  const permissionIdSet = new Set((insertedCorePermissions ?? []).map((item) => item.id))

  await upsertSeedConfigs({
    tableName: 'digital_right_configs',
    mappingTableName: 'digital_right_config_permissions',
    configForeignKey: 'digital_right_config_id',
    configs: digitalRightConfigsSeed,
    permissionIdSet,
  })

  await upsertSeedConfigs({
    tableName: 'physical_right_configs',
    mappingTableName: 'physical_right_config_permissions',
    configForeignKey: 'physical_right_config_id',
    configs: physicalRightConfigsSeed,
    permissionIdSet,
  })

  await upsertSeedConfigs({
    tableName: 'expression_configs',
    mappingTableName: 'expression_config_permissions',
    configForeignKey: 'expression_config_id',
    configs: expressionConfigsSeed,
    permissionIdSet,
  })

  await upsertSeedConfigs({
    tableName: 'modification_configs',
    mappingTableName: 'modification_config_permissions',
    configForeignKey: 'modification_config_id',
    configs: modificationConfigsSeed,
    permissionIdSet,
  })

  const admin01 = emailToUser.get('admin01@musica.local')
  if (!admin01) throw new Error('Missing admin01')

  const tracksToInsert = tracksSeed.map((t, index) => {
    const artist = emailToUser.get(t.artistEmail)
    if (!artist) throw new Error(`Missing artist ${t.artistEmail}`)
    return {
      id: randomUUID(),
      title: t.title,
      artist_id: artist.id,
      author_name: artist.full_name,
      genre: t.genre,
      duration: t.duration,
      status: t.status,
      created_by: admin01.id,
    }
  })

  const { data: insertedTracks, error: insertTracksError } = await client
    .from('products')
    .insert(tracksToInsert)
    .select('id,title,artist_id')

  if (insertTracksError) throw new Error(insertTracksError.message)

  const titleToTrack = new Map((insertedTracks ?? []).map((t) => [t.title, t]))

  const complianceReviewsToInsert = buildComplianceSeedEntries().map((entry, index) => {
    const track = titleToTrack.get(entry.trackTitle)
    if (!track) throw new Error(`Missing track for compliance seed ${entry.trackTitle}`)

    const reviewedAt =
      entry.review_status === 'PENDING'
        ? null
        : new Date(Date.now() - (index + 1) * 6 * 60 * 60 * 1000).toISOString()

    const uploadedLegalFiles = Array.from({ length: entry.fileCount }).map((_, fileIndex) => ({
      fileName: `legal-${index + 1}-${fileIndex + 1}.pdf`,
      fileKey: `legal-files/${getMonthPath(new Date())}/${randomUUID()}.pdf`,
      uploadedAt: reviewedAt ?? new Date().toISOString(),
      mimeType: 'application/pdf',
      size: 1024 * (fileIndex + 1),
    }))

    return {
      track_id: track.id,
      uploaded_legal_files: uploadedLegalFiles,
      legal_status: entry.legal_status,
      review_status: entry.review_status,
      reject_reason: entry.reject_reason,
      reviewed_by: entry.review_status === 'PENDING' ? null : admin01.id,
      reviewed_at: reviewedAt,
    }
  })

  const { data: insertedComplianceReviews, error: insertComplianceReviewsError } = await client
    .from('compliance_reviews')
    .insert(complianceReviewsToInsert)
    .select('id,track_id,uploaded_legal_files')

  if (insertComplianceReviewsError) throw new Error(insertComplianceReviewsError.message)

  const trackIdToCompliance = new Map((insertedComplianceReviews ?? []).map((item) => [item.track_id, item]))

  const complianceLegalFilesToInsert = (insertedComplianceReviews ?? []).flatMap((compliance) =>
    (Array.isArray(compliance.uploaded_legal_files) ? compliance.uploaded_legal_files : []).map((file) => ({
      compliance_review_id: compliance.id,
      file_name: file.fileName,
      file_key: file.fileKey,
      mime_type: file.mimeType,
      file_size_bytes: file.size,
      uploaded_by: admin01.id,
      uploaded_at: file.uploadedAt,
    })),
  )

  if (complianceLegalFilesToInsert.length > 0) {
    const { error: insertComplianceLegalFilesError } = await client
      .from('compliance_legal_files')
      .insert(complianceLegalFilesToInsert)

    if (insertComplianceLegalFilesError) throw new Error(insertComplianceLegalFilesError.message)
  }

  const complianceApprovedPermissionsToInsert = buildComplianceSeedEntries().flatMap((entry) => {
    const track = titleToTrack.get(entry.trackTitle)
    if (!track) throw new Error(`Missing track for approved permission seed ${entry.trackTitle}`)

    const compliance = trackIdToCompliance.get(track.id)
    if (!compliance) throw new Error(`Missing compliance for track ${entry.trackTitle}`)

    return entry.permissionIds.map((permissionId) => {
      if (!permissionIdSet.has(permissionId)) throw new Error(`Missing permission id for ${permissionId}`)
      return {
        compliance_id: compliance.id,
        permission_id: permissionId,
      }
    })
  })

  if (complianceApprovedPermissionsToInsert.length > 0) {
    const { error: insertComplianceApprovedPermissionsError } = await client
      .from('compliance_approved_permissions')
      .insert(complianceApprovedPermissionsToInsert)

    if (insertComplianceApprovedPermissionsError) throw new Error(insertComplianceApprovedPermissionsError.message)
  }

  const trackAllowedPermissionsToInsert = buildComplianceSeedEntries().flatMap((entry) => {
    if (entry.legal_status !== 'SUFFICIENT' || entry.review_status !== 'APPROVED') return []

    const track = titleToTrack.get(entry.trackTitle)
    if (!track) throw new Error(`Missing track for allowed permission seed ${entry.trackTitle}`)

    return entry.permissionIds.map((permissionId) => {
      if (!permissionIdSet.has(permissionId)) throw new Error(`Missing permission id for ${permissionId}`)
      return {
        track_id: track.id,
        permission_id: permissionId,
      }
    })
  })

  if (trackAllowedPermissionsToInsert.length > 0) {
    const { error: insertTrackAllowedPermissionsError } = await client
      .from('track_allowed_permissions')
      .insert(trackAllowedPermissionsToInsert)

    if (insertTrackAllowedPermissionsError) throw new Error(insertTrackAllowedPermissionsError.message)
  }

  const certificatesToInsert = certificatesSeed.map((c) => {
    const track = titleToTrack.get(c.trackTitle)
    const buyer = emailToUser.get(c.buyerEmail)
    if (!track) throw new Error(`Missing track ${c.trackTitle}`)
    if (!buyer) throw new Error(`Missing buyer ${c.buyerEmail}`)

    const issuedAt = new Date(Date.now() - c.daysAgo * 24 * 60 * 60 * 1000)

    return {
      track_id: track.id,
      buyer_id: buyer.id,
      artist_id: track.artist_id,
      selected_usage_rights: c.rights,
      track_snapshot_name: c.trackTitle,
      buyer_snapshot_name: buyer.full_name,
      artist_snapshot_name: userIdToFullName.get(track.artist_id) ?? 'Artist',
      pdf_file_key: `certificate-pdfs/${getMonthPath(issuedAt)}/${randomUUID()}.pdf`,
      status: 'ACTIVE',
      valid_from: issuedAt.toISOString(),
      created_at: issuedAt.toISOString(),
    }
  })

  const { error: insertCertificatesError } = await client.from('certificates').insert(certificatesToInsert)
  if (insertCertificatesError) throw new Error(insertCertificatesError.message)

  const defaultTemplate =
    '<!doctype html><html><head><meta charset="utf-8" /><title>Certificate</title></head><body><h1>License Certificate</h1><p>Certificate ID: {{certificateId}}</p><p>Track: {{trackSnapshotName}}</p><p>Buyer: {{buyerSnapshotName}}</p><p>Artist: {{artistSnapshotName}}</p><p>Usage Rights: {{selectedUsageRights}}</p><p>Valid From: {{validFrom}}</p><p>Valid Until: {{validUntil}}</p><p>Issued At: {{createdAt}}</p></body></html>'

  const { error: insertTemplateError } = await client
    .from('certificate_templates')
    .insert({ html_template: defaultTemplate })

  if (insertTemplateError && !isMissingTableError(insertTemplateError.message)) {
    throw new Error(insertTemplateError.message)
  }

  process.stdout.write('Seed dev data: DONE\n')
  process.stdout.write('Login users: admin01@musica.local / Password123!\n')
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`)
  process.exit(1)
})
