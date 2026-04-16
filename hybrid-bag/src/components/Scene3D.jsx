import BottleScene, { BOTTLE_SCROLL_VH } from "./BottleScene";
import BagScene, { BAG_START_VH } from "./BagScene";

export { BOTTLE_SCROLL_VH, BAG_START_VH };

export default function Scene3D({ onBottleReady }) {
  return (
    <>
      <BottleScene onReady={onBottleReady} />
      <BagScene />
    </>
  );
}
