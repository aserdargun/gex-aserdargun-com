// GEX educational CUDA example. Requires NVIDIA GPU + CUDA Toolkit.
// Compile: nvcc -O2 tiled-gemm.cu -o example && ./example
// No performance claims. Check every runtime call and compare to a host reference.
#include <cuda_runtime.h>
#include <cstdio>
#include <cstdlib>
#include <vector>
#define CUDA(call) do { cudaError_t e=(call); if(e!=cudaSuccess) { \
  std::fprintf(stderr, "%s:%d: %s\n", __tiled-gemm__, __LINE__, cudaGetErrorString(e)); \
  std::exit(1); } } while(0)

// This executable demonstrates shared-memory tiling on the scalar arithmetic path.
// It does NOT claim to issue Tensor Core instructions. Use the linked CUTLASS source
// for architecture-specific MMA kernels and supported shapes / formats.
template<int T> __global__ void tiled(const float* A,const float* B,float* C,int N) {
  __shared__ float a[T][T],b[T][T];
  int row=blockIdx.y*T+threadIdx.y,col=blockIdx.x*T+threadIdx.x;
  float sum=0;
  for(int k=0;k<N;k+=T) {
    a[threadIdx.y][threadIdx.x]=(row<N&&k+threadIdx.x<N)?A[row*N+k+threadIdx.x]:0;
    b[threadIdx.y][threadIdx.x]=(col<N&&k+threadIdx.y<N)?B[(k+threadIdx.y)*N+col]:0;
    __syncthreads();
    for(int t=0;t<T;++t)sum+=a[threadIdx.y][t]*b[t][threadIdx.x];
    __syncthreads();
  }
  if(row<N&&col<N)C[row*N+col]=sum;
}
int main() {
  const int N=8,T=4;std::vector<float>a(N*N),b(N*N),c(N*N);
  for(int i=0;i<N*N;++i){a[i]=float((i/N+i%N)%4+1);b[i]=float(((i/N)*2+i%N)%3+1);}
  float *da,*db,*dc;CUDA(cudaMalloc(&da,N*N*sizeof(float)));CUDA(cudaMalloc(&db,N*N*sizeof(float)));CUDA(cudaMalloc(&dc,N*N*sizeof(float)));
  CUDA(cudaMemcpy(da,a.data(),N*N*sizeof(float),cudaMemcpyHostToDevice));CUDA(cudaMemcpy(db,b.data(),N*N*sizeof(float),cudaMemcpyHostToDevice));
  tiled<T><<<dim3((N+T-1)/T,(N+T-1)/T),dim3(T,T)>>>(da,db,dc,N);CUDA(cudaGetLastError());CUDA(cudaDeviceSynchronize());
  CUDA(cudaMemcpy(c.data(),dc,N*N*sizeof(float),cudaMemcpyDeviceToHost));
  for(int r=0;r<N;++r)for(int col=0;col<N;++col){float ref=0;for(int k=0;k<N;++k)ref+=a[r*N+k]*b[k*N+col];if(c[r*N+col]!=ref)return 2;}
  CUDA(cudaFree(da));CUDA(cudaFree(db));CUDA(cudaFree(dc));std::puts("Tiled matrix reference passed.");
}
