# File Storage Specialist — Generic
# ファイルストレージスペシャリスト — 汎用
# Chuyen Gia File Storage — Dung Chung

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, Azure.Storage.Blobs, AWSSDK.S3
**Aspect**: Infrastructure — Blob Storage, File Uploads, Streaming, Presigned URLs
**Purpose**: Consultation agent for /plan and /execute — file storage patterns for any .NET project

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Namespace Pattern** | `{Domain}.Infrastructure.Storage` |
| **Variant** | ALL |
| **Pattern Numbers** | 88.1–88.2 |
| **Source Paths** | `**/Storage/*.cs` |
| **File Count** | 1 interface + 1 impl per provider |
| **Naming Convention** | `IFileStorage` / `{Provider}FileStorage` |
| **Imports From** | Application (storage interface), Infrastructure (cloud SDK) |
| **Cannot Import** | Domain, Presentation |
| **Imported By** | Application (handlers manage file uploads/downloads) |
| **Dependencies** | `Azure.Storage.Blobs` or `AWSSDK.S3` |
| **When To Use** | File uploads, blob storage, streaming, presigned URLs, chunked upload |
| **Source Skeleton** | `src/{Domain}.Infrastructure/Storage/` |
| **Specialist Type** | code |
| **Purpose** | Generate file storage abstractions for Azure Blob / AWS S3 with streaming upload |
| **Activation Trigger** | `files: **/Storage/*.cs; keywords: IFileStorage, BlobServiceClient, UploadAsync` |

---

## ROLE

**Your ONLY responsibility**: Enforce file storage standards — abstraction via IFileStorage interface, streaming uploads (no buffering entire file in memory), presigned URLs for direct client upload, and content type validation.

---

## Patterns

### Pattern 88.1: IFileStorage Abstraction
> Source: E1 file-storage

```csharp
// DO — Interface for storage [E1]
public interface IFileStorage
{
    Task<string> UploadAsync(string container, string fileName, Stream content,
        string contentType, CancellationToken ct);
    Task<Stream> DownloadAsync(string container, string fileName, CancellationToken ct);
    Task<Uri> GetPresignedUrlAsync(string container, string fileName,
        TimeSpan expiry, CancellationToken ct);
}

// DO — Azure Blob implementation [E1]
public sealed class AzureBlobStorage(BlobServiceClient client) : IFileStorage
{
    public async Task<string> UploadAsync(string container, string fileName,
        Stream content, string contentType, CancellationToken ct)
    {
        var containerClient = client.GetBlobContainerClient(container);
        await containerClient.CreateIfNotExistsAsync(cancellationToken: ct);
        var blob = containerClient.GetBlobClient(fileName);
        await blob.UploadAsync(content, new BlobHttpHeaders { ContentType = contentType }, cancellationToken: ct);
        return blob.Uri.ToString();
    }
}
```

### Pattern 88.2: Streaming Upload Endpoint
> Source: E1 file-storage

```csharp
// DO — Stream directly, no buffering [E1]
group.MapPost("/upload", async (IFormFile file, IFileStorage storage, CancellationToken ct) =>
{
    if (file.Length > 10_000_000) return TypedResults.Problem("File too large", statusCode: 413);
    await using var stream = file.OpenReadStream();
    var url = await storage.UploadAsync("uploads", file.FileName, stream, file.ContentType, ct);
    return TypedResults.Ok(new { url });
}).DisableAntiforgery();
```

---

*File Storage Specialist v2.0 — Generic*
*Sources: E1 file-storage*
*Pattern range: 88.1–88.2*
