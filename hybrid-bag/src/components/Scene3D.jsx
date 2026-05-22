import BagScene, {
  BAG_START_VH,
  TEXT_TRACK_BEFORE_BAG_VH,
} from "./BagScene";

export { BAG_START_VH, TEXT_TRACK_BEFORE_BAG_VH };

export default function Scene3D({ onBagReady }) {
  return <BagScene onReady={onBagReady} />;
}
