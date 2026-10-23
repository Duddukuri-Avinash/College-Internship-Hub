import sql, { type config as SqlConfig } from 'mssql/msnodesqlv8'

type NativeSqlConfig = SqlConfig & { connectionString: string }

declare global {
  // eslint-disable-next-line no-var
  var internHubSqlPool: Promise<sql.ConnectionPool> | undefined
}

function nativeConfig(connectionString: string, url: URL): NativeSqlConfig {
  const database = decodeURIComponent(url.pathname.replace(/^\/+/, ''))

  return {
    connectionString,
    server: url.hostname || 'localhost',
    ...(database ? { database } : {}),
    connectionTimeout: 15_000,
    requestTimeout: 15_000,
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30_000,
    },
  }
}

function databaseConfig(): NativeSqlConfig {
  const value = process.env.DATABASE_URL
  if (!value) throw new Error('DATABASE_URL is required.')

  let url: URL
  try {
    url = new URL(value.replace(/^mssql\+pyodbc:/i, 'mssql:'))
  } catch {
    throw new Error('DATABASE_URL must be a valid SQL Server connection URL.')
  }

  if (!['mssql:', 'sqlserver:'].includes(url.protocol)) {
    throw new Error('DATABASE_URL must use the mssql+pyodbc SQL Server format.')
  }

  const connectionString = url.searchParams.get('odbc_connect')
  if (connectionString) {
    return nativeConfig(connectionString, url)
  }

  const database = decodeURIComponent(url.pathname.replace(/^\/+/, ''))

  if (!url.hostname || !database) {
    throw new Error('DATABASE_URL must include a SQL Server host and database name.')
  }

  const queryValue = (name: string) => {
    const entry = Array.from(url.searchParams.entries()).find(
      ([key]) => key.toLowerCase() === name.toLowerCase(),
    )
    return entry?.[1]
  }
  const enabled = (value: string | undefined, defaultValue: boolean) =>
    value === undefined ? defaultValue : ['yes', 'true', '1'].includes(value.toLowerCase())
  const odbcValue = (value: string) => `{${value.replace(/}/g, '}}')}}`
  const trustedConnection = enabled(
    queryValue('trusted_connection'),
    !url.username && !url.password,
  )
  const driver = queryValue('driver') ?? 'ODBC Driver 18 for SQL Server'
  const server = `${url.hostname}${url.port ? `,${url.port}` : ''}`
  const parts = [
    `Driver=${odbcValue(driver)}`,
    `Server=${odbcValue(server)}`,
    `Database=${odbcValue(database)}`,
    trustedConnection ? 'Trusted_Connection=yes' : '',
    url.username && !trustedConnection ? `UID=${odbcValue(decodeURIComponent(url.username))}` : '',
    url.password && !trustedConnection ? `PWD=${odbcValue(decodeURIComponent(url.password))}` : '',
    `Encrypt=${enabled(queryValue('encrypt'), true) ? 'yes' : 'no'}`,
    `TrustServerCertificate=${enabled(queryValue('trustservercertificate'), false) ? 'yes' : 'no'}`,
  ].filter(Boolean)

  return nativeConfig(parts.join(';'), url)
}

export function getPool(): Promise<sql.ConnectionPool> {
  if (!globalThis.internHubSqlPool) {
    globalThis.internHubSqlPool = new sql.ConnectionPool(databaseConfig())
      .connect()
      .catch((error: unknown) => {
        globalThis.internHubSqlPool = undefined
        throw error
      })
  }

  const pool = globalThis.internHubSqlPool
  if (!pool) throw new Error('SQL Server connection pool initialization failed.')
  return pool
}

export { sql }
