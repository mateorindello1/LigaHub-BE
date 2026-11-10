BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[TokenRefresco] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [usuarioId] INT NOT NULL,
    [familiaId] UNIQUEIDENTIFIER NOT NULL,
    [tokenHash] CHAR(64) NOT NULL,
    [fechaHoraCreacion] DATETIME2 NOT NULL CONSTRAINT [TokenRefresco_fechaHoraCreacion_df] DEFAULT CURRENT_TIMESTAMP,
    [fechaHoraVencimiento] DATETIME2 NOT NULL,
    [fechaHoraRevocacion] DATETIME2,
    CONSTRAINT [TokenRefresco_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [TokenRefresco_tokenHash_key] UNIQUE NONCLUSTERED ([tokenHash])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TokenRefresco_usuarioId_idx] ON [dbo].[TokenRefresco]([usuarioId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TokenRefresco_familiaId_idx] ON [dbo].[TokenRefresco]([familiaId]);

-- AddForeignKey
ALTER TABLE [dbo].[TokenRefresco] ADD CONSTRAINT [TokenRefresco_usuarioId_fkey] FOREIGN KEY ([usuarioId]) REFERENCES [dbo].[Usuario]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
