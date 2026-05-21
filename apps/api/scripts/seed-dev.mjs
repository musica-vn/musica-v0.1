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

const usersSeed = [
  { email: 'superadmin@musica.local', full_name: 'Super Admin', role: 'SUPER_ADMIN' },
  { email: 'admin01@musica.local', full_name: 'Admin 01', role: 'ADMIN' },
  { email: 'admin02@musica.local', full_name: 'Admin 02', role: 'ADMIN' },
  { email: 'artist01@musica.local', full_name: 'Artist 01', role: 'ARTIST' },
  { email: 'artist02@musica.local', full_name: 'Artist 02', role: 'ARTIST' },
  { email: 'artist03@musica.local', full_name: 'Artist 03', role: 'ARTIST' },
  { email: 'buyer01@musica.local', full_name: 'Buyer 01', role: 'BUYER' },
  { email: 'buyer02@musica.local', full_name: 'Buyer 02', role: 'BUYER' },
  { email: 'buyer03@musica.local', full_name: 'Buyer 03', role: 'BUYER' },
  { email: 'buyer04@musica.local', full_name: 'Buyer 04', role: 'BUYER' },
  { email: 'buyer05@musica.local', full_name: 'Buyer 05', role: 'BUYER' },
  { email: 'buyer06@musica.local', full_name: 'Buyer 06', role: 'BUYER' },
  { email: 'buyer07@musica.local', full_name: 'Buyer 07', role: 'BUYER' },
  { email: 'buyer08@musica.local', full_name: 'Buyer 08', role: 'BUYER' },
]

const tracksSeed = [
  { title: `Midnight Pulse${seedTag}`, artistEmail: 'artist01@musica.local', genre: 'Electronic', duration: 182, status: 'PUBLISHED', usage_rights: ['SOCIAL_USE', 'YOUTUBE_USE'] },
  { title: `Neon Skyline${seedTag}`, artistEmail: 'artist01@musica.local', genre: 'Electronic', duration: 156, status: 'PUBLISHED', usage_rights: ['ADS_USE', 'COMMERCIAL_USE'] },
  { title: `Cinematic Rise${seedTag}`, artistEmail: 'artist02@musica.local', genre: 'Cinematic', duration: 201, status: 'PUBLISHED', usage_rights: ['EVENT_USE'] },
  { title: `Corporate Breeze${seedTag}`, artistEmail: 'artist02@musica.local', genre: 'Corporate', duration: 128, status: 'PUBLISHED', usage_rights: ['SOCIAL_USE'] },
  { title: `Pop Spark${seedTag}`, artistEmail: 'artist03@musica.local', genre: 'Pop', duration: 174, status: 'PUBLISHED', usage_rights: ['YOUTUBE_USE', 'COMMERCIAL_USE'] },
  { title: `Ambient Drift${seedTag}`, artistEmail: 'artist03@musica.local', genre: 'Cinematic', duration: 223, status: 'PUBLISHED', usage_rights: ['SOCIAL_USE', 'EVENT_USE'] },
  { title: `Late Night Drive${seedTag}`, artistEmail: 'artist01@musica.local', genre: 'Electronic', duration: 190, status: 'PUBLISHED', usage_rights: ['ADS_USE'] },
  { title: `Bright Morning${seedTag}`, artistEmail: 'artist02@musica.local', genre: 'Pop', duration: 165, status: 'PUBLISHED', usage_rights: ['SOCIAL_USE', 'ADS_USE'] },
  { title: `Soft Focus${seedTag}`, artistEmail: 'artist03@musica.local', genre: 'Corporate', duration: 142, status: 'PUBLISHED', usage_rights: ['COMMERCIAL_USE'] },
  { title: `Festival Lights${seedTag}`, artistEmail: 'artist01@musica.local', genre: 'Pop', duration: 198, status: 'PUBLISHED', usage_rights: ['EVENT_USE', 'SOCIAL_USE'] },
  { title: `Hidden Draft 01${seedTag}`, artistEmail: 'artist01@musica.local', genre: 'Electronic', duration: 160, status: 'HIDDEN', usage_rights: ['SOCIAL_USE'] },
  { title: `Hidden Draft 02${seedTag}`, artistEmail: 'artist02@musica.local', genre: 'Cinematic', duration: 210, status: 'HIDDEN', usage_rights: ['YOUTUBE_USE'] },
  { title: `Hidden Draft 03${seedTag}`, artistEmail: 'artist03@musica.local', genre: 'Corporate', duration: 120, status: 'HIDDEN', usage_rights: ['ADS_USE'] },
  { title: `Hidden Draft 04${seedTag}`, artistEmail: 'artist01@musica.local', genre: 'Pop', duration: 175, status: 'HIDDEN', usage_rights: ['COMMERCIAL_USE'] },
  { title: `Hidden Draft 05${seedTag}`, artistEmail: 'artist02@musica.local', genre: 'Corporate', duration: 135, status: 'HIDDEN', usage_rights: ['EVENT_USE'] },
  { title: `Ocean Haze${seedTag}`, artistEmail: 'artist03@musica.local', genre: 'Ambient', duration: 204, status: 'PUBLISHED', usage_rights: ['SOCIAL_USE'] },
  { title: `Street Rhythm${seedTag}`, artistEmail: 'artist01@musica.local', genre: 'HipHop', duration: 177, status: 'PUBLISHED', usage_rights: ['YOUTUBE_USE'] },
  { title: `Golden Hour${seedTag}`, artistEmail: 'artist02@musica.local', genre: 'Pop', duration: 189, status: 'PUBLISHED', usage_rights: ['COMMERCIAL_USE'] },
  { title: `Tech Pulse${seedTag}`, artistEmail: 'artist01@musica.local', genre: 'Electronic', duration: 161, status: 'HIDDEN', usage_rights: ['ADS_USE'] },
  { title: `Minimal Corporate${seedTag}`, artistEmail: 'artist03@musica.local', genre: 'Corporate', duration: 133, status: 'HIDDEN', usage_rights: ['SOCIAL_USE'] },
]

const certificatesSeed = [
  { trackTitle: `Midnight Pulse${seedTag}`, buyerEmail: 'buyer01@musica.local', rights: ['YOUTUBE_USE'], daysAgo: 3 },
  { trackTitle: `Neon Skyline${seedTag}`, buyerEmail: 'buyer01@musica.local', rights: ['ADS_USE'], daysAgo: 8 },
  { trackTitle: `Cinematic Rise${seedTag}`, buyerEmail: 'buyer02@musica.local', rights: ['EVENT_USE'], daysAgo: 6 },
  { trackTitle: `Corporate Breeze${seedTag}`, buyerEmail: 'buyer03@musica.local', rights: ['SOCIAL_USE'], daysAgo: 10 },
  { trackTitle: `Pop Spark${seedTag}`, buyerEmail: 'buyer04@musica.local', rights: ['COMMERCIAL_USE'], daysAgo: 2 },
  { trackTitle: `Ambient Drift${seedTag}`, buyerEmail: 'buyer05@musica.local', rights: ['EVENT_USE'], daysAgo: 4 },
  { trackTitle: `Late Night Drive${seedTag}`, buyerEmail: 'buyer06@musica.local', rights: ['ADS_USE'], daysAgo: 1 },
  { trackTitle: `Bright Morning${seedTag}`, buyerEmail: 'buyer07@musica.local', rights: ['SOCIAL_USE', 'ADS_USE'], daysAgo: 7 },
  { trackTitle: `Soft Focus${seedTag}`, buyerEmail: 'buyer08@musica.local', rights: ['COMMERCIAL_USE'], daysAgo: 12 },
  { trackTitle: `Festival Lights${seedTag}`, buyerEmail: 'buyer02@musica.local', rights: ['EVENT_USE'], daysAgo: 5 },
  { trackTitle: `Ocean Haze${seedTag}`, buyerEmail: 'buyer03@musica.local', rights: ['SOCIAL_USE'], daysAgo: 9 },
  { trackTitle: `Street Rhythm${seedTag}`, buyerEmail: 'buyer04@musica.local', rights: ['YOUTUBE_USE'], daysAgo: 11 },
  { trackTitle: `Golden Hour${seedTag}`, buyerEmail: 'buyer05@musica.local', rights: ['COMMERCIAL_USE'], daysAgo: 13 },
]

const getMonthPath = (date) => {
  const year = String(date.getUTCFullYear()).padStart(4, '0')
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${year}/${month}`
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
      .from('tracks')
      .select('id')
      .in('created_by', seedUserIds)

    if (createdByTrackIdsError) throw new Error(createdByTrackIdsError.message)

    const { data: titleTrackIds, error: titleTrackIdsError } = await client
      .from('tracks')
      .select('id')
      .ilike('title', `%${seedTag}%`)

    if (titleTrackIdsError) throw new Error(titleTrackIdsError.message)

    const trackIds = Array.from(
      new Set([...(createdByTrackIds ?? []), ...(titleTrackIds ?? [])].map((x) => x.id)),
    )

    if (trackIds.length > 0) {
      const { error: delTracksError } = await client.from('tracks').delete().in('id', trackIds)
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
    .eq('code', 'DEFAULT')
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

  const { data: roles, error: rolesError } = await client.from('roles').select('id,code')
  if (rolesError) throw new Error(rolesError.message)

  const roleCodeToId = new Map((roles ?? []).map((r) => [r.code, r.id]))

  const userRolesToInsert = usersSeed.map((u) => {
    const user = emailToUser.get(u.email)
    const roleId = roleCodeToId.get(u.role)
    if (!user || !roleId) throw new Error(`Missing user/role mapping for ${u.email}`)
    return { user_id: user.id, role_id: roleId }
  })

  const { error: insertUserRolesError } = await client.from('user_roles').insert(userRolesToInsert)
  if (insertUserRolesError) throw new Error(insertUserRolesError.message)

  const admin01 = emailToUser.get('admin01@musica.local')
  if (!admin01) throw new Error('Missing admin01')

  const tracksToInsert = tracksSeed.map((t) => {
    const artist = emailToUser.get(t.artistEmail)
    if (!artist) throw new Error(`Missing artist ${t.artistEmail}`)
    return {
      title: t.title,
      artist_id: artist.id,
      author_name: artist.full_name,
      genre: t.genre,
      duration: t.duration,
      status: t.status,
      usage_rights: t.usage_rights,
      created_by: admin01.id,
    }
  })

  const { data: insertedTracks, error: insertTracksError } = await client
    .from('tracks')
    .insert(tracksToInsert)
    .select('id,title,artist_id')

  if (insertTracksError) throw new Error(insertTracksError.message)

  const titleToTrack = new Map((insertedTracks ?? []).map((t) => [t.title, t]))

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
    .insert({ code: 'DEFAULT', html_template: defaultTemplate })

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
