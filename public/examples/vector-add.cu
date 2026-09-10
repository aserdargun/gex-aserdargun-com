// GEX educational CUDA example. Requires NVIDIA GPU + CUDA Toolkit.
// Compile: nvcc -O2 vector-add.cu -o example && ./example
// No performance claims. Check every runtime call and compare to a host reference.
#include <cuda_runtime.h>
#include <cstdio>
#include <cstdlib>
#include <vector>
#define CUDA(call) do { cudaError_t e=(call); if(e!=cudaSuccess) { \
  std::fprintf(stderr, "%s:%d: %s\n", __FILE__, __LINE__, cudaGetErrorString(e)); \
  std::exit(1); } } while(0)

__global__ void add(const float* A,const float* B,float* C,int N) {
  int i=blockIdx.x*blockDim.x+threadIdx.x;
  if(i<N) C[i]=A[i]+B[i];
}
int main() {
  const int N=1024, threads=128;
  std::vector<float> a(N),b(N),c(N);
  for(int i=0;i<N;++i){a[i]=float(i);b[i]=float(2*i);}
  float *da,*db,*dc;
  CUDA(cudaMalloc(&da,N*sizeof(float))); CUDA(cudaMalloc(&db,N*sizeof(float))); CUDA(cudaMalloc(&dc,N*sizeof(float)));
  CUDA(cudaMemcpy(da,a.data(),N*sizeof(float),cudaMemcpyHostToDevice));
  CUDA(cudaMemcpy(db,b.data(),N*sizeof(float),cudaMemcpyHostToDevice));
  add<<<(N+threads-1)/threads,threads>>>(da,db,dc,N);
  CUDA(cudaGetLastError()); CUDA(cudaDeviceSynchronize());
  CUDA(cudaMemcpy(c.data(),dc,N*sizeof(float),cudaMemcpyDeviceToHost));
  for(int i=0;i<N;++i) if(c[i]!=a[i]+b[i]) return 2;
  CUDA(cudaFree(da));CUDA(cudaFree(db));CUDA(cudaFree(dc));
  std::puts("Vector reference passed.");
}
