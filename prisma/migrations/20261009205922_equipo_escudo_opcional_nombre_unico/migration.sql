/*
  Warnings:

  - A unique constraint covering the columns `[nombre]` on the table `Equipo` will be added. If there are existing duplicate values, this will fail.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Equipo] ALTER COLUMN [escudoURL] VARCHAR(500) NULL;

-- CreateIndex
ALTER TABLE [dbo].[Equipo] ADD CONSTRAINT [Equipo_nombre_key] UNIQUE NONCLUSTERED ([nombre]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
