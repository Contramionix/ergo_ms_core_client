// Реестр компонентов для runtime рендеринга
import LcpContainer from '../components/layout/LcpContainer.vue'
import LcpRow from '../components/layout/LcpRow.vue'
import LcpColumn from '../components/layout/LcpColumn.vue'
import LcpCard from '../components/layout/LcpCard.vue'
import LcpText from '../components/basic/LcpText.vue'
import LcpHeading from '../components/basic/LcpHeading.vue'
import LcpButton from '../components/basic/LcpButton.vue'
import LcpImage from '../components/basic/LcpImage.vue'
import LcpIcon from '../components/basic/LcpIcon.vue'
import LcpDivider from '../components/basic/LcpDivider.vue'
import LcpInput from '../components/forms/LcpInput.vue'
import LcpSelect from '../components/forms/LcpSelect.vue'
import LcpCheckbox from '../components/forms/LcpCheckbox.vue'
import LcpUnknown from '../components/LcpUnknown.vue'

export const componentRegistry = {
  // Layout
  Container: LcpContainer,
  Row: LcpRow,
  Column: LcpColumn,
  Card: LcpCard,
  
  // Basic
  Text: LcpText,
  Heading: LcpHeading,
  Button: LcpButton,
  Image: LcpImage,
  Icon: LcpIcon,
  Divider: LcpDivider,
  
  // Forms
  Input: LcpInput,
  Select: LcpSelect,
  Checkbox: LcpCheckbox,
  
  // Fallback
  Unknown: LcpUnknown,
}

export default componentRegistry


