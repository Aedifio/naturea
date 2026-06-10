import { Injectable, inject } from '@angular/core';
import { CodirDataService } from './codir-data.service';
import { AgencyService } from './agency.service';
import { FactoryService } from './factory.service';
import { PortalContentService } from './portal-content.service';
import { RecrutementDataService } from '../../features/recrutement/services/recrutement-data.service';
import { OssatureDataService } from '../../features/ossature/services/ossature-data.service';
import { AuditTechniqueDataService } from '../../features/audit-technique/services/audit-technique-data.service';
import { AuditCommerceDataService } from '../../features/audit-commerce/services/audit-commerce-data.service';
import { ChiffrageDataService } from '../../features/chiffrage/services/chiffrage-data.service';

/** Loads all feature data from Supabase normalized tables after authentication. */
@Injectable({ providedIn: 'root' })
export class AppDataBootstrapService {
  private readonly portal = inject(PortalContentService);
  private readonly factory = inject(FactoryService);
  private readonly agency = inject(AgencyService);
  private readonly recrutement = inject(RecrutementDataService);
  private readonly codir = inject(CodirDataService);
  private readonly ossature = inject(OssatureDataService);
  private readonly auditTechnique = inject(AuditTechniqueDataService);
  private readonly auditCommerce = inject(AuditCommerceDataService);
  private readonly chiffrage = inject(ChiffrageDataService);

  async loadAll(): Promise<void> {
    await this.factory.load();
    await this.agency.load();
    await Promise.all([
      this.portal.load(),
      this.recrutement.load(),
      this.codir.load(),
      this.ossature.load(),
      this.auditTechnique.load(),
      this.auditCommerce.load(),
      this.chiffrage.load(),
    ]);
  }
}
