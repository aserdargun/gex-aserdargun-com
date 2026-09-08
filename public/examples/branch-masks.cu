// GEX educational CUDA example. Requires NVIDIA GPU + CUDA Toolkit.
// Compile: nvcc -O2 branch-masks.cu -o example && ./example
// No performance claims. Check every runtime call and compare to a host reference.
#include <cuda_runtime.h>
#include <cstdio>
#include <cstdlib>
#include <vector>
#define CUDA(call) do { cudaError_t e=(call); if(e!=cudaSuccess) { \
  std::fprintf(stderr, "%s:%d: %s\n", __branch-masks__, __LINE__, cudaGetErrorString(e)); \
  std::exit(1); } } while(0)

__global__ void branches(int* out,bool uniform) {
  int i=threadIdx.x;
  if(uniform || i%2==0) out[i]=i+1;
  else out[i]=i*2;
}
int main() {
  int *d; CUDA(cudaMalloc(&d,32*sizeof(int))); int host[32];
  for(int uniform=0;uniform<=1;++uniform) {
    branches<<<1,32>>>(d,bool(uniform)); CUDA(cudaGetLastError());CUDA(cudaDeviceSynchronize());
    CUDA(cudaMemcpy(host,d,32*sizeof(int),cudaMemcpyDeviceToHost));
    for(int i=0;i<32;++i) if(host[i]!=(uniform||i%2==0?i+1:i*2))return 2;
  }
  CUDA(cudaFree(d));std::puts("Both branch references passed. Compiler lowering may use predication.");
}
