import type { ModalSpec } from '../ui'
import { DataModal, ParkingModal } from './Misc'
import { CellModal, NoteModal } from './Notes'
import { BulkModal, DroppedModal, SourceModal } from './Sources'
import { ExportModal, ParaModal, SectionModal, ThemeModal, ThemesModal } from './Writing'

export function ModalHost({ spec }: { spec: ModalSpec }) {
  switch (spec.kind) {
    case 'source':
      return <SourceModal id={spec.id} />
    case 'note':
      return <NoteModal id={spec.id} sourceId={spec.sourceId} themeId={spec.themeId} />
    case 'para':
      return <ParaModal si={spec.si} pi={spec.pi} />
    case 'section':
      return <SectionModal i={spec.i} />
    case 'theme':
      return <ThemeModal id={spec.id} />
    case 'cell':
      return <CellModal sid={spec.sid} tid={spec.tid} />
    case 'themes':
      return <ThemesModal />
    case 'bulk':
      return <BulkModal />
    case 'dropped':
      return <DroppedModal />
    case 'export':
      return <ExportModal />
    case 'data':
      return <DataModal />
    case 'parking':
      return <ParkingModal />
  }
}
