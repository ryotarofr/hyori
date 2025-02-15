import contentDisposition from "content-disposition";
export const getFileFromFetchResponse = async (response) => {
    const blob = await response.blob();
    const dispositionRaw = response.headers.get("Content-Disposition") ?? undefined;
    const disposition = dispositionRaw
        ? contentDisposition.parse(dispositionRaw)
        : undefined;
    const contentType = response.headers.get("Content-Type") ?? undefined;
    const fileName = disposition?.parameters?.["filename"] ?? "名称未設定のファイル";
    return new File([blob], fileName, {
        type: contentType,
    });
};
