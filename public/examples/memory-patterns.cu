// GEX educational CUDA example. Requires NVIDIA GPU + CUDA Toolkit.
// Compile: nvcc -O2 memory-patterns.cu -o example && ./example
// No performance claims. Check every runtime call and compare to a host reference.
#include <cuda_runtime.h>
#include <cstdio>
#include <cstdlib>
#include <vector>
#define CUDA(call) do { cudaError_t e=(call); if(e!=cudaSuccess) { \
  std::fprintf(stderr, "%s:%d: %s\n", __memory-patterns__, __LINE__, cudaGetErrorString(e)); \
  std::exit(1); } } while(0)

__global__ void access(const float* A,float* C,int pattern,int stride) {
  int lane=threadIdx.x;
  int address=pattern==0?lane:pattern==1?lane*stride:(lane*73+19)%256;
  C[lane]=A[address]*2.0f;
}
int main() {
  std::vector<float> a(256),c(32);for(int i=0;i<256;++i)a[i]=float(i);
  float *da,*dc;CUDA(cudaMalloc(&da,256*sizeof(float)));CUDA(cudaMalloc(&dc,32*sizeof(float)));
  CUDA(cudaMemcpy(da,a.data(),256*sizeof(float),cudaMemcpyHostToDevice));
  for(int pattern=0;pattern<3;++pattern) {
    access<<<1,32>>>(da,dc,pattern,8);CUDA(cudaGetLastError());CUDA(cudaDeviceSynchronize());
    CUDA(cudaMemcpy(c.data(),dc,32*sizeof(float),cudaMemcpyDeviceToHost));
    for(int i=0;i<32;++i){int address=pattern==0?i:pattern==1?i*8:(i*73+19)%256;if(c[i]!=a[address]*2)return 2;}
  }
  CUDA(cudaFree(da));CUDA(cudaFree(dc));std::puts("All address-pattern references passed. No timing measured.");
}
