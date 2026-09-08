import { l, type ComponentId } from "./types";

export const components = {
  board: {
    name: l("Accelerator board", "Hızlandırıcı kartı"),
    role: l(
      "Connects the package, memory and host interface.",
      "Paketi, belleği ve ana işlemci arayüzünü bağlar.",
    ),
    relationship: l("System → package", "Sistem → paket"),
  },
  package: {
    name: l("GPU package", "GPU paketi"),
    role: l(
      "Houses the die and its electrical connections.",
      "Yongayı ve elektrik bağlantılarını barındırır.",
    ),
    relationship: l("Board → package → die", "Kart → paket → yonga"),
  },
  die: {
    name: l("GPU die", "GPU yongası"),
    role: l(
      "Contains the on-chip compute and memory structures.",
      "Yonga içindeki hesaplama ve bellek yapılarını içerir.",
    ),
    relationship: l(
      "Package → die → processing groups",
      "Paket → yonga → işlem grupları",
    ),
  },
  cluster: {
    name: l("Processing group", "İşlem grubu"),
    role: l(
      "Groups SMs in this educational layout; it is not a scheduling guarantee.",
      "Bu eğitim yerleşiminde SM’leri gruplar; bir zamanlama garantisi değildir.",
    ),
    relationship: l("Die → processing group → SM", "Yonga → işlem grubu → SM"),
  },
  sm: {
    name: l("Streaming multiprocessor", "Streaming multiprocessor"),
    role: l(
      "Hosts thread blocks and the resources that execute their instructions.",
      "Thread bloklarını ve komutlarını yürüten kaynakları barındırır.",
    ),
    relationship: l(
      "Block → one SM → resident warps",
      "Blok → bir SM → yerleşik warp’lar",
    ),
  },
  scheduler: {
    name: l("Warp scheduler", "Warp zamanlayıcı"),
    role: l(
      "Selects eligible warps for instruction issue. A resident warp can still be waiting.",
      "Komut başlatmak için uygun warp’ları seçer. Yerleşik bir warp bekliyor olabilir.",
    ),
    relationship: l(
      "Ready warp → instruction → execution resource",
      "Hazır warp → komut → yürütme kaynağı",
    ),
  },
  arithmetic: {
    name: l("Arithmetic resources", "Aritmetik kaynakları"),
    role: l(
      "Execute supported scalar and other general arithmetic instructions.",
      "Desteklenen skaler ve diğer genel aritmetik komutları yürütür.",
    ),
    relationship: l(
      "Instructions + operands → results",
      "Komutlar + veriler → sonuçlar",
    ),
  },
  tensor: {
    name: l("Matrix execution resources", "Matris yürütme kaynakları"),
    role: l(
      "Perform supported matrix multiply-accumulate operations. Tile and datatype support depend on the target.",
      "Desteklenen matris çarpma-biriktirme işlemlerini yapar. Döşeme ve veri türü desteği hedefe bağlıdır.",
    ),
    relationship: l(
      "Fragments → matrix operation → accumulator",
      "Parçalar → matris işlemi → biriktirici",
    ),
  },
  registers: {
    name: l("Register file", "Yazmaç dosyası"),
    role: l(
      "Holds live thread state. Allocation is finite; excessive use can limit residency or lead to spills.",
      "Thread’lerin canlı durumunu tutar. Tahsis sonludur; fazla kullanım yerleşik işi azaltabilir veya taşmaya yol açabilir.",
    ),
    relationship: l(
      "Per-thread logical state → SM resource",
      "Thread başına mantıksal durum → SM kaynağı",
    ),
  },
  shared: {
    name: l("Shared memory / L1", "Paylaşılan bellek / L1"),
    role: l(
      "Shared memory is explicit block-local storage. L1 is a cache; they have different programming roles.",
      "Paylaşılan bellek açıkça kullanılan blok yerel deposudur. L1 bir önbellektir; programlama rolleri farklıdır.",
    ),
    relationship: l(
      "Cooperation and locality inside the SM",
      "SM içinde işbirliği ve yerellik",
    ),
  },
  loadstore: {
    name: l("Load / store path", "Yükle / sakla yolu"),
    role: l(
      "Connects memory instructions to data access. Access layout affects the resulting traffic.",
      "Bellek komutlarını veri erişimine bağlar. Erişim düzeni oluşan trafiği etkiler.",
    ),
    relationship: l(
      "Lane addresses → memory requests",
      "Şerit adresleri → bellek istekleri",
    ),
  },
  l2: {
    name: l("L2 cache", "L2 önbelleği"),
    role: l(
      "An on-chip cache shared across SMs. Reuse can reduce requests to external memory.",
      "SM’lerin paylaştığı yonga içi önbellek. Yeniden kullanım harici bellek isteklerini azaltabilir.",
    ),
    relationship: l(
      "SM memory paths ↔ L2 ↔ device memory",
      "SM bellek yolları ↔ L2 ↔ aygıt belleği",
    ),
  },
  controller: {
    name: l("Memory controller", "Bellek denetleyicisi"),
    role: l(
      "Manages the interface to device memory. Shown as a conceptual connection.",
      "Aygıt belleğine erişim arayüzünü yönetir. Kavramsal bir bağlantı olarak gösterilir.",
    ),
    relationship: l(
      "On-chip memory system ↔ device memory",
      "Yonga içi bellek sistemi ↔ aygıt belleği",
    ),
  },
  global: {
    name: l("Global memory", "Global bellek"),
    role: l(
      "Device memory holds arrays such as A, B and C. Physical packaging can use different memory technologies.",
      "Aygıt belleği A, B ve C gibi dizileri tutar. Fiziksel paket farklı bellek teknolojileri kullanabilir.",
    ),
    relationship: l(
      "Large data sets ↔ cache hierarchy ↔ SM",
      "Büyük veri kümeleri ↔ önbellek hiyerarşisi ↔ SM",
    ),
  },
  host: {
    name: l("Host interface", "Ana işlemci arayüzü"),
    role: l(
      "Connects the host with the device. Launching work and transferring data are distinct actions.",
      "Ana işlemciyi aygıta bağlar. İş başlatmak ve veri aktarmak ayrı eylemlerdir.",
    ),
    relationship: l(
      "CPU / host ↔ GPU / device",
      "CPU / ana işlemci ↔ GPU / aygıt",
    ),
  },
} satisfies Record<
  ComponentId,
  {
    name: ReturnType<typeof l>;
    role: ReturnType<typeof l>;
    relationship: ReturnType<typeof l>;
  }
>;

export const anatomyParts: ComponentId[] = [
  "board",
  "package",
  "die",
  "cluster",
  "sm",
  "l2",
  "controller",
  "global",
  "host",
];
export const smParts: ComponentId[] = [
  "scheduler",
  "arithmetic",
  "tensor",
  "loadstore",
  "registers",
  "shared",
];
