import { ApiProperty } from '@nestjs/swagger';

export class CertificateListItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  trackId: string;

  @ApiProperty()
  buyerId: string;

  @ApiProperty()
  artistId: string;

  @ApiProperty()
  trackSnapshotName: string;

  @ApiProperty()
  buyerSnapshotName: string;

  @ApiProperty()
  artistSnapshotName: string;

  @ApiProperty({ enum: ['ACTIVE'] })
  status: 'ACTIVE';

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  validFrom: string;

  @ApiProperty({ required: false, nullable: true })
  validUntil: string | null;

  @ApiProperty({ required: false, nullable: true })
  buyerEmail: string | null;
}

export class CertificateDetailDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  trackId: string;

  @ApiProperty()
  buyerId: string;

  @ApiProperty()
  artistId: string;

  @ApiProperty({ type: [String] })
  selectedUsageRights: string[];

  @ApiProperty()
  trackSnapshotName: string;

  @ApiProperty()
  buyerSnapshotName: string;

  @ApiProperty()
  artistSnapshotName: string;

  @ApiProperty()
  pdfFileKey: string;

  @ApiProperty({ enum: ['ACTIVE'] })
  status: 'ACTIVE';

  @ApiProperty()
  validFrom: string;

  @ApiProperty({ required: false, nullable: true })
  validUntil: string | null;

  @ApiProperty()
  createdAt: string;

  @ApiProperty({ required: false, nullable: true })
  buyerEmail: string | null;
}

export class CertificateDownloadUrlDataDto {
  @ApiProperty()
  downloadUrl: string;

  @ApiProperty()
  fileName: string;
}

export class CertificateTemplateDto {
  @ApiProperty({ type: Number, nullable: true })
  id: number | null;

  @ApiProperty()
  htmlTemplate: string;

  @ApiProperty()
  updatedAt: string;
}

export class CertificateRenderedHtmlDto {
  @ApiProperty()
  html: string;
}
