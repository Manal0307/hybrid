import BagScene, {
  BAG_START_VH,
  BAG_SCENE_FULL_VH,
  TEXT_TRACK_BEFORE_BAG_VH,
  EMERGENCE_START,
  EMERGENCE_END,
  PRODUCT_REVEAL_VH,
} from "./BagScene";

export {
  BAG_START_VH,
  BAG_SCENE_FULL_VH,
  TEXT_TRACK_BEFORE_BAG_VH,
  EMERGENCE_START,
  EMERGENCE_END,
  PRODUCT_REVEAL_VH,
};

export default function Scene3D({
  onBagReady,
  phase,
  snapToProduct = false,
  heroTitleOpacity = 0,
}) {
  return (
    <BagScene
      onReady={onBagReady}
      phase={phase}
      snapToProduct={snapToProduct}
      heroTitleOpacity={heroTitleOpacity}
    />
  );
}
