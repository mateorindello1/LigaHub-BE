BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Torneo] (
    [id] INT NOT NULL IDENTITY(1,1),
    [nombre] VARCHAR(100) NOT NULL,
    [anio] INT NOT NULL,
    [estadoTorneo] TINYINT NOT NULL,
    CONSTRAINT [Torneo_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[FechaFixture] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [torneoId] INT NOT NULL,
    [numeroFecha] INT NOT NULL,
    CONSTRAINT [FechaFixture_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [FechaFixture_torneoId_numeroFecha_key] UNIQUE NONCLUSTERED ([torneoId],[numeroFecha])
);

-- CreateTable
CREATE TABLE [dbo].[Partido] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [estadoPartido] TINYINT NOT NULL,
    [fechaFixtureId] UNIQUEIDENTIFIER NOT NULL,
    [fechaHoraPartido] DATETIME2,
    [canchaId] INT,
    [equipoLocalId] INT NOT NULL,
    [equipoVisitanteId] INT NOT NULL,
    [cantidadGolesLocal] INT,
    [cantidadGolesVisitante] INT,
    CONSTRAINT [Partido_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Equipo] (
    [id] INT NOT NULL IDENTITY(1,1),
    [nombre] VARCHAR(100) NOT NULL,
    [escudoURL] VARCHAR(500) NOT NULL,
    CONSTRAINT [Equipo_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Jugador] (
    [id] INT NOT NULL IDENTITY(1,1),
    [dni] VARCHAR(20) NOT NULL,
    [nombres] VARCHAR(100) NOT NULL,
    [apellidos] VARCHAR(100) NOT NULL,
    [email] VARCHAR(254) NOT NULL,
    [telefono] VARCHAR(20) NOT NULL,
    [direccion] VARCHAR(200) NOT NULL,
    CONSTRAINT [Jugador_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Jugador_dni_key] UNIQUE NONCLUSTERED ([dni])
);

-- CreateTable
CREATE TABLE [dbo].[InscripcionEquipo] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [equipoId] INT NOT NULL,
    [torneoId] INT NOT NULL,
    CONSTRAINT [InscripcionEquipo_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [InscripcionEquipo_equipoId_torneoId_key] UNIQUE NONCLUSTERED ([equipoId],[torneoId])
);

-- CreateTable
CREATE TABLE [dbo].[InscripcionJugador] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [inscripcionEquipoId] UNIQUEIDENTIFIER NOT NULL,
    [jugadorId] INT NOT NULL,
    [dorsal] INT NOT NULL,
    [capitan] BIT NOT NULL,
    CONSTRAINT [InscripcionJugador_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [InscripcionJugador_inscripcionEquipoId_jugadorId_key] UNIQUE NONCLUSTERED ([inscripcionEquipoId],[jugadorId]),
    CONSTRAINT [InscripcionJugador_inscripcionEquipoId_dorsal_key] UNIQUE NONCLUSTERED ([inscripcionEquipoId],[dorsal])
);

-- CreateTable
CREATE TABLE [dbo].[PartidoJugador] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [partidoId] UNIQUEIDENTIFIER NOT NULL,
    [inscripcionJugadorId] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [PartidoJugador_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [PartidoJugador_partidoId_inscripcionJugadorId_key] UNIQUE NONCLUSTERED ([partidoId],[inscripcionJugadorId])
);

-- CreateTable
CREATE TABLE [dbo].[Evento] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [partidoJugadorId] UNIQUEIDENTIFIER NOT NULL,
    [partidoJugadorCambioId] UNIQUEIDENTIFIER,
    [minuto] INT NOT NULL,
    [tipoEvento] TINYINT NOT NULL,
    CONSTRAINT [Evento_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Predio] (
    [id] INT NOT NULL IDENTITY(1,1),
    [nombre] VARCHAR(100) NOT NULL,
    [direccion] VARCHAR(200) NOT NULL,
    CONSTRAINT [Predio_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Cancha] (
    [id] INT NOT NULL IDENTITY(1,1),
    [predioId] INT NOT NULL,
    [numero] INT NOT NULL,
    [descripcion] VARCHAR(200) NOT NULL,
    CONSTRAINT [Cancha_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Cancha_predioId_numero_key] UNIQUE NONCLUSTERED ([predioId],[numero])
);

-- CreateTable
CREATE TABLE [dbo].[Usuario] (
    [id] INT NOT NULL IDENTITY(1,1),
    [email] VARCHAR(254) NOT NULL,
    [contraseniaHash] VARCHAR(255) NOT NULL,
    [fotoPerfilURL] VARCHAR(500) NOT NULL,
    [jugadorId] INT,
    CONSTRAINT [Usuario_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Usuario_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[UsuarioRol] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [usuarioId] INT NOT NULL,
    [rol] TINYINT NOT NULL,
    CONSTRAINT [UsuarioRol_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UsuarioRol_usuarioId_rol_key] UNIQUE NONCLUSTERED ([usuarioId],[rol])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Partido_fechaFixtureId_idx] ON [dbo].[Partido]([fechaFixtureId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Partido_canchaId_idx] ON [dbo].[Partido]([canchaId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Partido_equipoLocalId_idx] ON [dbo].[Partido]([equipoLocalId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Partido_equipoVisitanteId_idx] ON [dbo].[Partido]([equipoVisitanteId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [InscripcionEquipo_torneoId_idx] ON [dbo].[InscripcionEquipo]([torneoId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [InscripcionJugador_jugadorId_idx] ON [dbo].[InscripcionJugador]([jugadorId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PartidoJugador_inscripcionJugadorId_idx] ON [dbo].[PartidoJugador]([inscripcionJugadorId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Evento_partidoJugadorId_idx] ON [dbo].[Evento]([partidoJugadorId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Evento_partidoJugadorCambioId_idx] ON [dbo].[Evento]([partidoJugadorCambioId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Usuario_jugadorId_idx] ON [dbo].[Usuario]([jugadorId]);

-- AddForeignKey
ALTER TABLE [dbo].[FechaFixture] ADD CONSTRAINT [FechaFixture_torneoId_fkey] FOREIGN KEY ([torneoId]) REFERENCES [dbo].[Torneo]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Partido] ADD CONSTRAINT [Partido_fechaFixtureId_fkey] FOREIGN KEY ([fechaFixtureId]) REFERENCES [dbo].[FechaFixture]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Partido] ADD CONSTRAINT [Partido_canchaId_fkey] FOREIGN KEY ([canchaId]) REFERENCES [dbo].[Cancha]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Partido] ADD CONSTRAINT [Partido_equipoLocalId_fkey] FOREIGN KEY ([equipoLocalId]) REFERENCES [dbo].[Equipo]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Partido] ADD CONSTRAINT [Partido_equipoVisitanteId_fkey] FOREIGN KEY ([equipoVisitanteId]) REFERENCES [dbo].[Equipo]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[InscripcionEquipo] ADD CONSTRAINT [InscripcionEquipo_equipoId_fkey] FOREIGN KEY ([equipoId]) REFERENCES [dbo].[Equipo]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[InscripcionEquipo] ADD CONSTRAINT [InscripcionEquipo_torneoId_fkey] FOREIGN KEY ([torneoId]) REFERENCES [dbo].[Torneo]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[InscripcionJugador] ADD CONSTRAINT [InscripcionJugador_inscripcionEquipoId_fkey] FOREIGN KEY ([inscripcionEquipoId]) REFERENCES [dbo].[InscripcionEquipo]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[InscripcionJugador] ADD CONSTRAINT [InscripcionJugador_jugadorId_fkey] FOREIGN KEY ([jugadorId]) REFERENCES [dbo].[Jugador]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PartidoJugador] ADD CONSTRAINT [PartidoJugador_partidoId_fkey] FOREIGN KEY ([partidoId]) REFERENCES [dbo].[Partido]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PartidoJugador] ADD CONSTRAINT [PartidoJugador_inscripcionJugadorId_fkey] FOREIGN KEY ([inscripcionJugadorId]) REFERENCES [dbo].[InscripcionJugador]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Evento] ADD CONSTRAINT [Evento_partidoJugadorId_fkey] FOREIGN KEY ([partidoJugadorId]) REFERENCES [dbo].[PartidoJugador]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Evento] ADD CONSTRAINT [Evento_partidoJugadorCambioId_fkey] FOREIGN KEY ([partidoJugadorCambioId]) REFERENCES [dbo].[PartidoJugador]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Cancha] ADD CONSTRAINT [Cancha_predioId_fkey] FOREIGN KEY ([predioId]) REFERENCES [dbo].[Predio]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Usuario] ADD CONSTRAINT [Usuario_jugadorId_fkey] FOREIGN KEY ([jugadorId]) REFERENCES [dbo].[Jugador]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[UsuarioRol] ADD CONSTRAINT [UsuarioRol_usuarioId_fkey] FOREIGN KEY ([usuarioId]) REFERENCES [dbo].[Usuario]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
