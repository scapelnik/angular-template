import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';

export interface DynamicLayer {
  id: string;
  title: string;
  visible: boolean;
  olLayer: VectorLayer<VectorSource>;
}
